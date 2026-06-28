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
  /** Participant id (SpeakableMapObj id or the player sentinel) who speaks. */
  speakerId?: string | null;
  /** Per-node speaker image override. Overrides the object-level speakerImageId. */
  speakerImageId?: string | undefined;
  /**
   * Participant id who is listening. Choices are only meaningful when the
   * listener is the player.
   */
  listenerId?: string | null;
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
  initiatingChar: string | null;
  /**
   * All participant ids (SpeakableMapObj ids and/or the player sentinel) that
   * speak or listen anywhere in this dialogue.
   */
  participants: string[];
  /** Milestone slugs that activate this dialogue. */
  milestones: string[];
  nodes: EntityState<EngineDialogueNode, string>;
  edges: EntityState<Edge, string>;
}
