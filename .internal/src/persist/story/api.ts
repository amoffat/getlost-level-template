import type { StoryEdge, StoryNode } from "@/slices/story";
import { applyMigrations } from "@/utils/migrations";
import { decode, encode } from "cbor2";
import { getMigrations } from "./migrations";
import {
  BaseStoryDoc,
  LatestStoryDoc,
  SerializedState,
  latestVersion,
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
}> {
  const res = await fetch("/level/story.cbor.gz", { method: "GET" });
  if (res.status === 404) {
    return { nodes: [], edges: [] };
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

  if (migrated) {
    await saveStory(nodes, edges);
  }

  return { nodes, edges };
}

export async function saveStory(
  nodes: StoryNode[],
  edges: StoryEdge[],
): Promise<void> {
  const states = serializeToStates(nodes, edges);
  const doc: LatestStoryDoc = {
    version: latestVersion,
    states,
    dialogues: {},
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
