import { EntityState } from "@reduxjs/toolkit";
import { Edge, Node } from "@xyflow/react";

export interface Choice {
  id: string;
  textKey: string | null | undefined;
}
export interface SpeechData extends Record<string, unknown> {
  id: string;
  speakerNameKey: string | null | undefined;
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
  /** Story milestone IDs activated when the player reaches this speech node. */
  activationMilestones?: string[];
}

export type DNode = Node<SpeechData>;

export interface Dialogue {
  id: string;
  subjectId: string | null;
  /** Stable ReactFlow node UUIDs (or "default") that activate this dialogue. */
  milestoneNodeIds: string[];
  nodes: EntityState<DNode, string>;
  edges: EntityState<Edge, string>;
}
