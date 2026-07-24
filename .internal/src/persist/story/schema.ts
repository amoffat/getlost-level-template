import type { StoryEdge, StoryNode } from "@/slices/story";
import { Dialogue } from "@/types/dialogue";
import { EngineDialogue } from "@/types/engineDialogue";
import { SerializedState } from "@/types/state";

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

/**
 * v10: Multi-participant dialogues. Every speech node gains explicit
 * `speakerId`/`listenerId`. No structural changes to the doc shape — the
 * migration just backfills those fields on existing nodes.
 */
export interface StoryDocV10 extends Omit<StoryDocV9, "version"> {
  version: 10;
}

// v11: Asset ids (per-node `speakerImageId` overrides) migrated from SHA-1 hex to
// content-derived UUIDv5 via the shared id-remap table.
export interface StoryDocV11 extends Omit<StoryDocV10, "version"> {
  version: 11;
}

// v12: Locale keys decoupled from content. Every stored locale reference
// (contentKey / speakerNameKey / listenerNameKey / choices[].textKey) is
// remapped from the old content-derived key to a stable UUID via uuid5Hash,
// matching the locale-file migration.
export interface StoryDocV12 extends Omit<StoryDocV11, "version"> {
  version: 12;
}

export type LatestStoryDoc = StoryDocV12;
export const latestVersion = 12;
