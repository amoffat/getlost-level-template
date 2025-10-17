import type { StoryNode } from "@/slices/story";
import type { Edge } from "@xyflow/react";

export interface BaseStoryDoc {
  version: number;
}

// Legacy CBOR doc (not used by loader): stored DOT text
export interface StoryDocV1 extends BaseStoryDoc {
  version: 1;
  dot: string;
}

// New doc: persist nodes and edges from slice state
export interface StoryDocV2 extends BaseStoryDoc {
  version: 2;
  nodes: StoryNode[];
  edges: Edge[];
}

export type LatestStoryDoc = StoryDocV2;
export const latestVersion = 2;
