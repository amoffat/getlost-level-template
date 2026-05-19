import { EntityState } from "@reduxjs/toolkit";
import { Edge, Node } from "@xyflow/react";

export interface Choice {
  id: string;
  textKey: string | undefined;
}
export interface SpeechData extends Record<string, unknown> {
  id: string;
  speakerNameKey: string | undefined;
  contentKey: string | undefined;
  animated: boolean;
  choices: Choice[];
  isOrigin: boolean;
  /** Per-node speaker image override. Overrides the object-level speakerImageId. */
  speakerImageId?: string | null;
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

export interface SerializedDialogue {
  id: string;
  subjectId: string | null;
  // Milestone NAMES, not node IDs
  milestones: string[];
  dependents: SerializedDialogue[];
}
