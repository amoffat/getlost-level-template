import type { StoryNode } from "@/slices/story";
import { applyMigrations } from "@/utils/migrations";
import type { Edge } from "@xyflow/react";
import { decode, encode } from "cbor2";
import { getMigrations } from "./migrations";
import {
  BaseStoryDoc,
  LatestStoryDoc,
  StoryState,
  latestVersion,
} from "./schema";

/**
 * Converts ReactFlow nodes and edges into an array of serialized State objects.
 * Each node becomes a State, and edges define dependency/dependent relationships.
 */
export function serializeToStates(
  nodes: StoryNode[],
  edges: Edge[],
): StoryState[] {
  const stateMap = new Map<string, StoryState>();

  for (const node of nodes) {
    stateMap.set(node.id, {
      id: node.id,
      dependencies: [],
      dependents: [],
    });
  }

  for (const edge of edges) {
    const source = stateMap.get(edge.source);
    const target = stateMap.get(edge.target);
    if (target && !target.dependencies.includes(edge.source)) {
      target.dependencies.push(edge.source);
    }
    if (source && !source.dependents.includes(edge.target)) {
      source.dependents.push(edge.target);
    }
  }

  return Array.from(stateMap.values());
}

/**
 * Converts an array of serialized State objects back into ReactFlow nodes and edges.
 * Nodes are created with default positions; edges are derived from dependency relationships.
 */
export function deserializeFromStates(states: StoryState[]): {
  nodes: StoryNode[];
  edges: Edge[];
} {
  const nodes: StoryNode[] = states.map((state) => ({
    id: state.id,
    type: "story",
    position: { x: 0, y: 0 },
    data: { id: state.id },
  }));

  const edgeSet = new Set<string>();
  const edges: Edge[] = [];

  for (const state of states) {
    for (const depId of state.dependencies) {
      const edgeId = `${depId}-${state.id}`;
      if (!edgeSet.has(edgeId)) {
        edgeSet.add(edgeId);
        edges.push({
          id: edgeId,
          source: depId,
          target: state.id,
        });
      }
    }
  }

  return { nodes, edges };
}

export async function loadStory(): Promise<{
  nodes: StoryNode[];
  edges: Edge[];
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
  edges: Edge[],
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
