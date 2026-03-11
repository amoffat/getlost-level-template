import type { JunctionNode as JNode } from "@/slices/story";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import classNames from "classnames";
import styles from "./styles/JunctionNode.module.css";

/**
 * OR junction node – any one of the incoming connections being satisfied
 * is enough to activate the outgoing connection.
 * Has a single target (top) and a single source (bottom) handle.
 */
export default function OrNode({ selected }: NodeProps<JNode>) {
  const cls = classNames(styles.node, styles.or, {
    [styles.selected]: selected,
  });

  return (
    <div className={cls}>
      <Handle type="target" position={Position.Top} />
      OR
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
