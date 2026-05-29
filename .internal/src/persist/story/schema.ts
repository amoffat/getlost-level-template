import type { StoryEdge, StoryNode } from "@/slices/story";
import { Dialogue } from "@/types/dialogue";
import { EngineDialogue } from "@/types/engineDialogue";

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

  // Whether this milestone has been satisfied. Used only by the engine.
  satisfied: boolean;
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

/**
 * v7: dialogues field is now Record<objectId, Record<storyNodeId, Dialogue>>
 * where storyNodeId is the stable ReactFlow node UUID (not the user-editable
 * milestone name), so renames don't break linkages.
 */
export interface StoryDocV7 extends Omit<StoryDocV6, "version" | "dialogues"> {
  version: 7;
  dialogues: Record<string, Record<string, Dialogue>>;
}

/**
 * v8: editor/engine split. No more round-trip conversions.
 *
 * `editor` stores the raw, editor-friendly representation used by ReactFlow
 * and the dialogue editor.
 *
 * `engine` stores the derived, engine-compatible representation built on write.
 * It is never read back by the editor — only the game engine consumes it.
 */
export interface StoryDocV8 {
  version: 8;
  editor: {
    nodes: StoryNode[];
    edges: StoryEdge[];
    /** Flat array of all Dialogue objects — no indexing needed by the editor. */
    dialogues: Dialogue[];
  };
  engine: {
    /** Derived dependency graph consumed by the game engine. */
    states: SerializedState[];
    /**
     * Nested lookup: Record<objectId, Record<storyNodeId, EngineDialogue>>.
     * Built on write so the engine can resolve dialogues by (npc, milestone).
     * `activationMilestones` inside each node uses slugs, not ReactFlow UUIDs.
     */
    dialogues: Record<string, Record<string, EngineDialogue>>;
  };
}

/**
 * v9: Introduces the story origin node (id = "default", data.id = "start").
 * No structural changes to the schema — the migration just ensures the origin
 * node is present in editor.nodes.
 */
export interface StoryDocV9 extends Omit<StoryDocV8, "version"> {
  version: 9;
}

export type LatestStoryDoc = StoryDocV9;
export const latestVersion = 9;
