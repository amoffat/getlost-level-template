import { Node } from "@xyflow/react";

export interface Choice {
  id: string;
  text: string | undefined;
}
export interface DialogueData extends Record<string, unknown> {
  id: string;
  label: string;
  content: string | undefined;
  animated: boolean;
  choices: Choice[];
}

export interface SignData extends Record<string, unknown> {
  id: string;
  content: string | undefined;
}

export type DNode = Node<DialogueData | SignData>;
