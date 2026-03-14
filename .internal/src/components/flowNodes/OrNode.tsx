import { useAncestorHighlight } from "@/contexts/AncestorHighlightContext";
import type { JunctionNode as JNode } from "@/slices/story";
import { Stack } from "@mantine/core";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import classNames from "classnames";
import styles from "./styles/JunctionNode.module.css";

/**
 * OR junction node – any one of the incoming connections being satisfied
 * is enough to activate the outgoing connection.
 * Has a single target (top) and a single source (bottom) handle.
 */
export default function OrNode({ id, selected }: NodeProps<JNode>) {
  const { nodeIds: ancestorNodeIds } = useAncestorHighlight();
  const cls = classNames(styles.node, styles.or, {
    "react-flow__node-default": true,
    [styles.selected]: selected,
    [styles.ancestorHighlight]: !selected && ancestorNodeIds.has(id),
  });

  return (
    <div className={cls}>
      <Handle type="target" position={Position.Top} />
      <Stack p={0}>OR</Stack>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
