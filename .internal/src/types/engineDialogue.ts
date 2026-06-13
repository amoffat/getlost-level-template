import { EntityState } from "@reduxjs/toolkit";
import { Edge, Node } from "@xyflow/react";

/**
 * Engine-compatible parallel to `Choice`.
 * Kept separate so engine-specific fields can be added without affecting the
 * editor type.
 */
export interface EngineChoice {
  id: string;
  textKey: string | undefined;
}

/**
 * Engine-compatible parallel to `SpeechData`.
 *
 * Key difference: `activationMilestones` stores milestone *slugs*
 * (`StoryNode.data.id`) instead of the ReactFlow node UUIDs used by the
 * editor. This lets the engine resolve activations by name without knowledge
 * of internal graph IDs.
 */
export interface EngineSpeechData extends Record<string, unknown> {
  id: string;
  speakerNameKey: string | undefined;
  contentKey: string | undefined;
  animated: boolean;
  choices: EngineChoice[];
  isOrigin: boolean;
  /** Per-node speaker image override. Overrides the object-level speakerImageId. */
  speakerImageId?: string | undefined;
  /**
   * Milestone slugs (`StoryNode.data.id`) activated when the player reaches
   * this speech node. Slugs are stable user-editable names, not internal UUIDs.
   */
  activationMilestones?: string[];
}

export type EngineDialogueNode = Node<EngineSpeechData>;

/**
 * Engine-compatible parallel to `Dialogue`.
 * Nodes carry `EngineSpeechData` so that `activationMilestones` values are
 * slugs rather than ReactFlow UUIDs.
 */
export interface EngineDialogue {
  id: string;
  subjectId: string | null;
  /** Milestone slugs that activate this dialogue. */
  milestones: string[];
  nodes: EntityState<EngineDialogueNode, string>;
  edges: EntityState<Edge, string>;
}
