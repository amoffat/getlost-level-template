import { ORIGIN_NODE, type StoryEdge, type StoryNode } from "@/slices/story";
import { DIALOGUE_DEFAULTS, type Dialogue, type DNode } from "@/types/dialogue";
import type { EngineDialogue, EngineSpeechData } from "@/types/engineDialogue";
import { MILESTONE_NODE_DEFAULTS } from "@/types/properties";
import { SerializedState } from "@/types/state";
import { participantsOf } from "@/utils/dialogue";
import { applyMigrations } from "@/utils/migrations";
import { applyDefaultProps } from "@/utils/misc";
import { Edge } from "@xyflow/react";
import { decode, encode } from "cbor2";
import { getMigrations } from "./migrations";
import { BaseStoryDoc, LatestStoryDoc, latestVersion } from "./schema";

/**
 * Converts ReactFlow nodes and edges into an array of serialized State objects.
 * Each node becomes a StoryState or OrState, and edges define
 * dependency/dependent relationships.
 */
export function serializeToMilestoneStates({
  nodes,
  edges,
}: {
  nodes: StoryNode[];
  edges: StoryEdge[];
}): SerializedState[] {
  const nodeIdToState = new Map<string, SerializedState>();
  const nodeIdtoStateName = new Map<string, string>();

  for (const node of nodes) {
    const kind = node.type === "or" ? "or" : "story";
    if (kind === "story") {
      const stateName = node.data.id;
      nodeIdtoStateName.set(node.id, stateName);
      const waypoints = Object.fromEntries(
        (node.data.waypoints ?? []).map((mw) => [mw.characterId, mw]),
      );

      nodeIdToState.set(node.id, {
        id: node.id,
        name: stateName,
        kind,
        dependencies: [],
        dependents: [],
        satisfied: false,
        waypoints,
      });
    } else {
      nodeIdToState.set(node.id, {
        id: node.id,
        kind,
        dependencies: [],
        dependents: [],
      });
    }
  }

  for (const edge of edges) {
    const source = nodeIdToState.get(edge.source)!;
    const target = nodeIdToState.get(edge.target)!;
    const negated = edge.data?.negated ?? false;
    if (!target.dependencies.some((d) => d.stateId === edge.source)) {
      const stateId = nodeIdtoStateName.get(edge.source) ?? edge.source;
      target.dependencies.push({ stateId, negated });
    }
    if (!source.dependents.some((d) => d.stateId === edge.target)) {
      const stateId = nodeIdtoStateName.get(edge.target) ?? edge.target;
      source.dependents.push({ stateId, negated });
    }
  }

  return Array.from(nodeIdToState.values());
}

export async function loadStory(): Promise<{
  nodes: StoryNode[];
  edges: StoryEdge[];
  dialogues: Dialogue[];
}> {
  const res = await fetch("/level/story.cbor.gz", { method: "GET" });
  if (res.status === 404) {
    return { nodes: [ORIGIN_NODE], edges: [], dialogues: [] };
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
  const { nodes, edges, dialogues } = decoded.editor;

  // Fill in any properties absent from persisted story nodes using their
  // defaults. This replaces the need for migrations when adding new properties.
  for (const node of nodes) {
    if (node.type !== "or") {
      applyDefaultProps(node.data, MILESTONE_NODE_DEFAULTS);
    }
  }

  // Defensive cleanup: remove any dangling edges from loaded dialogues.
  for (const dlg of dialogues) {
    applyDefaultProps(dlg, DIALOGUE_DEFAULTS);
    cleanupDanglingEdges(dlg);
  }

  if (migrated) {
    await saveStory({ nodes, edges, dialogues });
  }

  return { nodes, edges, dialogues };
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
 * Converts a `Dialogue` into an `EngineDialogue`, milestone ids to milestone
 * slugs.
 */
function toEngineDialogue(
  dialogue: Dialogue,
  nodeIdToSlug: Map<string, string>,
): EngineDialogue {
  const engineEntities: Record<
    string,
    EngineDialogue["nodes"]["entities"][string]
  > = {};
  const mapMilestoneSlug = (uuid: string): string =>
    nodeIdToSlug.get(uuid) ?? uuid;

  for (const id of dialogue.nodes.ids as string[]) {
    const node = dialogue.nodes.entities[id];
    if (!node) continue;
    const engineData: EngineSpeechData = {
      ...node.data,
      choices: node.data.choices.map((c) => ({
        id: c.id,
        textKey: c.textKey ?? undefined,
      })),
      contentKey: node.data.contentKey ?? undefined,
      speakerNameKey: node.data.speakerNameKey ?? undefined,
      speakerId: node.data.speakerId ?? null,
      listenerId: node.data.listenerId ?? null,
      activationMilestones:
        node.data.activationMilestones?.map(mapMilestoneSlug),
    };
    engineEntities[id] = { ...node, data: engineData };
  }

  return {
    id: dialogue.id,
    initiatingChar: dialogue.initiatingChar,
    participants: [...participantsOf(dialogue)],
    milestones: dialogue.milestoneNodeIds.map(mapMilestoneSlug),
    exactMilestoneOnly: dialogue.exactMilestoneOnly,
    nodes: { ids: [...dialogue.nodes.ids], entities: engineEntities },
    edges: dialogue.edges,
  };
}

/**
 * Builds the nested engine dialogues record for the story doc.
 *
 * Structure: Record<participantId, Record<milestoneSlug, EngineDialogue>>
 *
 * - Top-level key: a *participant* id (any character — npc, tilegroup, or the
 *   player sentinel — that speaks or listens anywhere in the dialogue). A
 *   multi-participant dialogue is indexed under every participant, so the engine
 *   can resolve it by whichever character it has in hand. Player-facing dialogues
 *   remain addressable under the NPC id exactly as before (a superset).
 * - Second-level key: the milestone slug.
 * - A dialogue with multiple milestones is stored under each of those keys so
 *   any (participantId, milestone) pair resolves to the right dialogue.
 * - `activationMilestones` in each speech node is converted to slugs.
 *
 * Dialogues without any participants or without any milestones are omitted
 * because they have no addressable location in the record.
 */
function buildEngineDialoguesRecord(
  dialogues: Dialogue[],
  nodes: StoryNode[],
): Record<string, Record<string, EngineDialogue>> {
  const nodeIdToSlug = new Map(nodes.map((n) => [n.id, n.data.id]));
  const result: Record<string, Record<string, EngineDialogue>> = {};
  for (const dlg of dialogues) {
    if (dlg.milestoneNodeIds.length === 0) continue;
    const engineDlg = toEngineDialogue(dlg, nodeIdToSlug);
    if (engineDlg.participants.length === 0) continue;
    for (const participantId of engineDlg.participants) {
      for (const milestone of engineDlg.milestones) {
        (result[participantId] ??= {})[milestone] = engineDlg;
      }
    }
  }
  return result;
}

export async function saveStory({
  nodes,
  edges,
  dialogues,
}: {
  nodes: StoryNode[];
  edges: StoryEdge[];
  dialogues: Dialogue[];
}): Promise<void> {
  const doc: LatestStoryDoc = {
    version: latestVersion,
    editor: {
      nodes,
      edges,
      dialogues,
    },
    engine: {
      states: serializeToMilestoneStates({ nodes, edges }),
      dialogues: buildEngineDialoguesRecord(dialogues, nodes),
    },
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
