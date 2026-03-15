import type { StoryEdge, StoryNode } from "@/slices/story";
import { Dialogue } from "@/types/dialogue";

export interface StateEdge {
  stateId: string;
  negated: boolean;
}

export interface StoryState {
  id: string;
  kind: "story" | "or";
  dependencies: StateEdge[];
  dependents: StateEdge[];
}

export interface MilestoneState extends StoryState {
  kind: "story";
}

export interface OrState extends StoryState {
  kind: "or";
}

export type SerializedState = MilestoneState | OrState;

export function isMilestoneState(
  state: SerializedState,
): state is MilestoneState {
  return state.kind === "story";
}

export function isOrState(state: SerializedState): state is OrState {
  return state.kind === "or";
}

export interface BaseStoryDoc {
  version: number;
  nodes: StoryNode[];
  edges: StoryEdge[];
  dialogues: Record<string, Dialogue>;
}

export interface StoryDocV6 extends Omit<BaseStoryDoc, "version"> {
  version: 6;
  states: SerializedState[];
  dialogues: Record<string, Dialogue>;
}

export type LatestStoryDoc = StoryDocV6;
export const latestVersion = 6;
