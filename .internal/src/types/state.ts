import { MilestoneWaypoint } from "@/slices/story";

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
  name: string;

  /** Whether this milestone has been satisfied. Used only by the engine. */
  satisfied: boolean;
  /** Character id to waypoint */
  waypoints: Record<string, MilestoneWaypoint>;
}

export interface OrState extends StoryState {
  kind: "or";
}

export type SerializedState = MilestoneState | OrState;

export interface SerializedWaypoint {
  characterId: string;
  waypointId: string;
  speed: number;
}

export function isMilestoneState(
  state: SerializedState,
): state is MilestoneState {
  return state.kind === "story";
}

export function isOrState(state: SerializedState): state is OrState {
  return state.kind === "or";
}
