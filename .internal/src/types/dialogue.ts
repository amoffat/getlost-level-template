import { EntityState } from "@reduxjs/toolkit";
import { Edge, Node } from "@xyflow/react";

export interface Choice {
  id: string;
  text: string | undefined;
}
export interface SpeechData extends Record<string, unknown> {
  id: string;
  label: string | undefined;
  content: string | undefined;
  animated: boolean;
  choices: Choice[];
  isOrigin: boolean;
}

export interface SignData extends Record<string, unknown> {
  id: string;
  content: string | undefined;
}

export type DNode = Node<SpeechData>;

export interface Dialogue {
  id: string;
  subjectId: string | null;
  milestones: string[];
  nodes: EntityState<DNode, string>;
  edges: EntityState<Edge, string>;
}
