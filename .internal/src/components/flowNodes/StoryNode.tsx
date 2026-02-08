import type { StoryNode as DNode, StoryNodeData } from "@/slices/story";
import { selectors as tsSelectors } from "@/slices/tilesetEditor";
import { store } from "@/store/store";
import { NpcTemplate } from "@/types/npc";
import { Group, Stack } from "@mantine/core";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import TilesetGroup from "../TilesetGroup";
import styles from "./styles/StoryNode.module.css";

// Simple stub node component for story graph nodes.
// Displays the node label and exposes top/bottom handles for connections.
export default function StoryNode({ data }: NodeProps<DNode>) {
  const sData = (data as StoryNodeData) ?? ({} as StoryNodeData);
  const label = sData.id;
  const affectedNpcs = ["7fbdd117-277d-4e15-8ec0-5fcc2803048b"];

  let npcNode = null;
  if (affectedNpcs.length > 0) {
    const state = store.getState();
    const npcsTemplates = tsSelectors.templatesFromInstanceIds(
      state,
      affectedNpcs,
    ) as { inst: string; tmpl: NpcTemplate }[];

    const npcToTg = ({ inst, tmpl }: { inst: string; tmpl: NpcTemplate }) => {
      const tg = tmpl.animations.Idle.animation.frames[0]!.tg;
      return <TilesetGroup key={inst} scale={1.5} group={tg} />;
    };

    npcNode = <Group>{npcsTemplates.map(npcToTg)}</Group>;
  }

  return (
    <div className={`react-flow__node-default ${styles.node}`}>
      <Handle type="target" position={Position.Top} />
      <Stack p={0}>
        {label}
        {npcNode}
      </Stack>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
