import type { StoryEdge, StoryNode } from "@/slices/story";
import type { Dialogue, DNode } from "@/types/dialogue";
import { MILESTONE_NODE_DEFAULTS } from "@/types/properties";
import { applyMigrations } from "@/utils/migrations";
import { applyDefaultProps } from "@/utils/misc";
import { Edge } from "@xyflow/react";
import { decode, encode } from "cbor2";
import { getMigrations } from "./migrations";
import {
  BaseStoryDoc,
  LatestStoryDoc,
  latestVersion,
  SerializedState,
} from "./schema";

/**
 * Converts ReactFlow nodes and edges into an array of serialized State objects.
 * Each node becomes a StoryState or OrState, and edges define
 * dependency/dependent relationships.
 */
export function serializeToStates(
  nodes: StoryNode[],
  edges: StoryEdge[],
): SerializedState[] {
  const stateMap = new Map<string, SerializedState>();
  const nodeIdtoStateId = new Map<string, string>();

  for (const node of nodes) {
    const kind = node.type === "or" ? "or" : "story";
    if (kind === "story") {
      nodeIdtoStateId.set(node.id, node.data.id);
      stateMap.set(node.id, {
        id: node.data.id,
        kind,
        dependencies: [],
        dependents: [],
      });
    } else {
      stateMap.set(node.id, {
        id: node.id,
        kind,
        dependencies: [],
        dependents: [],
      });
    }
  }

  for (const edge of edges) {
    const source = stateMap.get(edge.source)!;
    const target = stateMap.get(edge.target)!;
    const negated = edge.data?.negated ?? false;
    if (!target.dependencies.some((d) => d.stateId === edge.source)) {
      const stateId = nodeIdtoStateId.get(edge.source) ?? edge.source;
      target.dependencies.push({ stateId, negated });
    }
    if (!source.dependents.some((d) => d.stateId === edge.target)) {
      const stateId = nodeIdtoStateId.get(edge.target) ?? edge.target;
      source.dependents.push({ stateId, negated });
    }
  }

  return Array.from(stateMap.values());
}

export async function loadStory(): Promise<{
  nodes: StoryNode[];
  edges: StoryEdge[];
  dialogues: Dialogue[];
}> {
  const res = await fetch("/level/story.cbor.gz", { method: "GET" });
  if (res.status === 404) {
    return { nodes: [], edges: [], dialogues: [] };
  }
  if (!res.ok) throw new Error(`loadStory failed: ${res.status}`);

  const migrations = await getMigrations();
  const baseDecoded = decode<BaseStoryDoc>(await res.bytes());
  const migrated = await applyMigrations(
    baseDecoded,
    migrations,
    latestVersion,
  );

  const decoded = baseDecoded as unknown as LatestStoryDoc;
  const { nodes, edges } = decoded;

  // Fill in any properties absent from persisted story nodes using their
  // defaults. This replaces the need for migrations when adding new properties.
  for (const node of nodes) {
    if (node.type !== "or") {
      applyDefaultProps(node.data, MILESTONE_NODE_DEFAULTS);
    }
  }

  // Extract unique Dialogue objects from the nested record
  const dialogues = extractDialogues(decoded.dialogues);

  if (migrated) {
    await saveStory(nodes, edges, dialogues);
  }

  return { nodes, edges, dialogues };
}

/**
 * Flattens the nested Record<objectId, Record<storyNodeId, Dialogue>> into a
 * deduplicated array of Dialogue objects.
 */
function extractDialogues(
  dialoguesRecord: Record<string, Record<string, Dialogue>>,
): Dialogue[] {
  const seen = new Set<string>();
  const result: Dialogue[] = [];
  for (const perObj of Object.values(dialoguesRecord)) {
    for (const dlg of Object.values(perObj)) {
      if (!seen.has(dlg.id)) {
        seen.add(dlg.id);
        cleanupDanglingEdges(dlg);
        result.push(dlg);
      }
    }
  }
  return result;
}

/**
 * Removes edges from a dialogue whose source/target node no longer exists, or
 * whose sourceHandle does not match any choice on the source node.
 */
function cleanupDanglingEdges(dlg: Dialogue): void {
  const validEdges = (dlg.edges.ids as string[])
    .map((id) => dlg.edges.entities[id] as Edge | undefined)
    .filter((edge): edge is Edge => {
      if (!edge) return false;
      const sourceNode = dlg.nodes.entities[edge.source] as DNode | undefined;
      if (!sourceNode) return false;
      if (!dlg.nodes.entities[edge.target]) return false;
      if (edge.sourceHandle) {
        return sourceNode.data.choices.some((c) => c.id === edge.sourceHandle);
      }
      return true;
    });
  dlg.edges.ids = validEdges.map((edge) => edge.id);
  dlg.edges.entities = Object.fromEntries(
    validEdges.map((edge) => [edge.id, edge]),
  );
}

/**
 * Builds the nested dialogues record for the story doc.
 *
 * Structure: Record<objectId, Record<storyNodeId, Dialogue>>
 *
 * - Top-level key: The speaker id (npc id, tilegroup id, etc).
 * - Second-level key: the stable ReactFlow story-node UUID stored in
 *   dialogue.milestoneNodeIds.  Using the UUID (not the user-editable milestone
 *   name) means that renaming a milestone does not break existing linkages.
 * - A dialogue with multiple milestones is stored under each of those keys so
 *   any (objectId, milestoneNodeId) pair resolves to the right dialogue.
 *
 * Dialogues without a subjectId or without any milestones are omitted because
 * they have no addressable location in the record.
 */
function buildDialoguesRecord(
  dialogues: Dialogue[],
): Record<string, Record<string, Dialogue>> {
  const result: Record<string, Record<string, Dialogue>> = {};
  for (const dlg of dialogues) {
    if (!dlg.subjectId || dlg.milestoneNodeIds.length === 0) continue;
    for (const milestoneId of dlg.milestoneNodeIds) {
      if (!result[dlg.subjectId]) {
        result[dlg.subjectId] = {};
      }
      result[dlg.subjectId][milestoneId] = dlg;
    }
  }
  return result;
}

export async function saveStory(
  nodes: StoryNode[],
  edges: StoryEdge[],
  dialogues: Dialogue[] = [],
): Promise<void> {
  const states = serializeToStates(nodes, edges);
  const doc: LatestStoryDoc = {
    version: latestVersion,
    states,
    dialogues: buildDialoguesRecord(dialogues),
    nodes,
    edges,
  };
  const payload = encode(doc);

  // Copy to standalone ArrayBuffer to satisfy BlobPart typing (mirrors map/api.ts)
  const ab = new ArrayBuffer(payload.byteLength);
  new Uint8Array(ab).set(payload);
  const blob = new Blob([ab], { type: "application/cbor" });

  const res = await fetch("/level/story.cbor.gz", {
    method: "PUT",
    headers: { "content-type": "application/cbor" },
    body: blob,
  });
  if (!res.ok) throw new Error(`saveStory failed: ${res.status}`);
}
