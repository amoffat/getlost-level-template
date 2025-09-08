import { Node } from "@xyflow/react";

interface NodeData extends Record<string, unknown> {
  label: string;
  content: string;
  animated: boolean;
}
export type DNode = Node<NodeData>;
