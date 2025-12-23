import type { StoryNode } from "@/slices/story";
import { applyMigrations } from "@/utils/migrations";
import type { Edge } from "@xyflow/react";
import { decode, encode } from "cbor2";
import { getMigrations } from "./migrations";
import { BaseStoryDoc, LatestStoryDoc, latestVersion } from "./schema";

export async function loadStory(): Promise<{
  nodes: StoryNode[];
  edges: Edge[];
}> {
  const res = await fetch("/level/story", { method: "GET" });
  if (res.status === 404) {
    // No story persisted yet
    return { nodes: [], edges: [] };
  }
  if (!res.ok) throw new Error(`loadStory failed: ${res.status}`);

  const migrations = await getMigrations();
  const baseDecoded = decode<BaseStoryDoc>(await res.bytes());
  const migrated = await applyMigrations(
    baseDecoded,
    migrations,
    latestVersion
  );

  const decoded = baseDecoded as LatestStoryDoc;
  const nodes = (decoded as any).nodes ?? [];
  const edges = (decoded as any).edges ?? [];

  if (migrated) {
    await saveStory(nodes as StoryNode[], edges as Edge[]);
  }

  return { nodes: nodes as StoryNode[], edges: edges as Edge[] };
}

export async function saveStory(
  nodes: StoryNode[],
  edges: Edge[]
): Promise<void> {
  const doc: LatestStoryDoc = {
    version: latestVersion,
    nodes,
    edges,
  } as LatestStoryDoc;
  const payload = encode(doc);

  // Copy to standalone ArrayBuffer to satisfy BlobPart typing (mirrors map/api.ts)
  const ab = new ArrayBuffer(payload.byteLength);
  new Uint8Array(ab).set(payload);
  const blob = new Blob([ab], { type: "application/cbor" });

  const res = await fetch("/level/story", {
    method: "PUT",
    headers: { "content-type": "application/cbor" },
    body: blob,
  });
  if (!res.ok) throw new Error(`saveStory failed: ${res.status}`);
}
