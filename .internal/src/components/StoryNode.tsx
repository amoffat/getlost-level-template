import type { StoryNode as DNode, StoryNodeData } from "@/slices/story";
import { Group, Stack } from "@mantine/core";
import { Handle, Position, type NodeProps } from "@xyflow/react";

// Simple stub node component for story graph nodes.
// Displays the node label and exposes top/bottom handles for connections.
export default function StoryNode({ data, selected }: NodeProps<DNode>) {
  const sData = (data as StoryNodeData) ?? ({} as StoryNodeData);
  const label = sData.label ?? "(unnamed)";

  return (
    <div>
      <Handle type="target" position={Position.Top} />
      <Stack>
        {label}
        <Group></Group>
      </Stack>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
