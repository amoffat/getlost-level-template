import { EntityState } from "@reduxjs/toolkit";
import { Edge, Node } from "@xyflow/react";

export interface Choice {
  id: string;
  textKey: string | null | undefined;
}

/** Per-emotion tunables for the CSS-only avatar FX in the engine's
 * DialogEffects.module.css, mapped 1:1 to the CSS custom properties each
 * `.fx-<emotion>` block reads. Populated by a downstream process, not
 * authored directly in this editor. */
export interface DialogFxOptsByEmotion {
  nervous: {
    templeX?: number;
    templeY?: number;
    fall?: number;
    speed?: number;
  };
  embarrassed: {
    templeX?: number;
    templeY?: number;
    fall?: number;
    cheekL?: number;
    cheekR?: number;
    cheekY?: number;
    speed?: number;
  };
  angry: { templeX?: number; templeY?: number; speed?: number };
  shocked: { headX?: number; headY?: number; speed?: number };
  confused: { headX?: number; headY?: number; speed?: number };
  idea: { headX?: number; headY?: number; speed?: number };
  love: { emitY?: number; rise?: number; emoji?: number; speed?: number };
  sad: { eyeX?: number; eyeY?: number; fall?: number; speed?: number };
  sick: { faceX?: number; faceY?: number; emoji?: number; speed?: number };
  sleepy: {
    headX?: number;
    headY?: number;
    rise?: number;
    emoji?: number;
    speed?: number;
  };
  excited: { emoji?: number; speed?: number };
  darkness: {
    eyeX?: number;
    eyeY?: number;
    eye2X?: number;
    voidSize?: number;
    speed?: number;
  };
}

export type DialogEmotion = keyof DialogFxOptsByEmotion;

export interface DialogAvatarEmotion<
  E extends DialogEmotion = DialogEmotion,
> {
  emotion: E;
  fxOpts?: DialogFxOptsByEmotion[E];
}

export interface SpeechData extends Record<string, unknown> {
  id: string;
  speakerNameKey: string | null | undefined;
  /** Per-node listener name override. Falls back to the listener's object name. */
  listenerNameKey?: string | null | undefined;
  contentKey: string | null | undefined;
  animated: boolean;
  choices: Choice[];
  isOrigin: boolean;
  /**
   * Participant id (a SpeakableMapObj id or the player sentinel) who speaks this
   * node. Defaults to the dialogue's subjectId.
   */
  speakerId: string | null;
  /**
   * Participant id who is listening. Defaults to the player. Choices/branching
   * are only allowed when the listener is the player.
   */
  listenerId: string | null;
  /** Per-node speaker image override. Overrides the object-level speakerImageId. */
  speakerImageId?: string | undefined;
  /** Per-node listener image override. Overrides the object-level speakerImageId. */
  listenerImageId?: string | undefined;
  /** Per-node speaker emotion FX override. */
  speakerEmotionFx?: DialogAvatarEmotion;
  /** Per-node listener emotion FX override. */
  listenerEmotionFx?: DialogAvatarEmotion;
  /** Story milestone IDs activated when the player reaches this speech node. */
  activationMilestones?: string[];
}

export type DNode = Node<SpeechData>;

export interface Dialogue {
  id: string;
  initiatingChar: string;
  /** Stable ReactFlow node UUIDs (or "default") that activate this dialogue. */
  milestoneNodeIds: string[];
  /**
   * When true, this dialogue activates only on an exact milestone match. The
   * engine will not surface it as a graph-distance fallback candidate for
   * milestones that aren't in `milestoneNodeIds`.
   */
  exactMilestoneOnly: boolean;
  nodes: EntityState<DNode, string>;
  edges: EntityState<Edge, string>;
}

/** Backfilled onto dialogues loaded from disk that predate a given field. */
export const DIALOGUE_DEFAULTS: Partial<Dialogue> = {
  exactMilestoneOnly: false,
};
