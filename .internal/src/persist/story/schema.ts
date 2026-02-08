import type { StoryNode } from "@/slices/story";
import type { Edge } from "@xyflow/react";

export interface BaseStoryDoc {
  version: number;
  nodes: StoryNode[];
  edges: Edge[];
}

// New doc: persist nodes and edges from slice state
export interface StoryDocV2 extends BaseStoryDoc {
  version: 2;
}

// Version 3: Moved label property to id in StoryNodeData
export interface StoryDocV3 extends Omit<StoryDocV2, "version"> {
  version: 3;
}

export interface StoryDocV4 extends Omit<StoryDocV3, "version"> {
  version: 4;
}

export type LatestStoryDoc = StoryDocV4;
export const latestVersion = 4;
