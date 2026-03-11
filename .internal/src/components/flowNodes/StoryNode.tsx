import { useAppSelector } from "@/hooks/redux";
import { selectors as dSelectors } from "@/slices/dialogue";
import { selectors as mapSelectors } from "@/slices/mapEditor";
import type { StoryNode as DNode } from "@/slices/story";
import { selectors as tsSelectors } from "@/slices/tilesetEditor";
import type { RootState } from "@/store/store";
import { isNpcInstance, isTileGroupInstance, type MapObj } from "@/types/map";
import { NpcTemplate } from "@/types/npc";
import { TileGroupTemplate } from "@/types/tilegroup";
import { Box, Flex, Stack, UnstyledButton } from "@mantine/core";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import classNames from "classnames";
import { useCallback } from "react";
import { useNavigate } from "react-router";
import TilesetGroup from "../TilesetGroup";
import styles from "./styles/StoryNode.module.css";

function SpeakerIcon({
  objId,
  dialogueId,
  milestoneId,
}: {
  objId: string;
  dialogueId: string;
  milestoneId: string;
}) {
  const obj = useAppSelector((state: RootState) =>
    mapSelectors.selectObject(state, objId),
  ) as MapObj | undefined;
  const navigate = useNavigate();

  const tmpl = useAppSelector((state: RootState) => {
    if (!obj) return null;
    if (!isNpcInstance(obj) && !isTileGroupInstance(obj)) return null;
    return tsSelectors.templateFromId(state, obj.tsObjId);
  });

  const onSpeakerClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      navigate(`/dialogues/${dialogueId}/${milestoneId}`);
    },
    [navigate, dialogueId, milestoneId],
  );

  if (!obj || !tmpl) return null;

  let icon;
  if (isNpcInstance(obj)) {
    const npcTmpl = tmpl as NpcTemplate;
    const tg = npcTmpl.animations.Idle.animation.frames[0]!.tg;
    icon = <TilesetGroup scale={1.5} group={tg} bounded />;
  } else if (isTileGroupInstance(obj)) {
    const tgTmpl = tmpl as TileGroupTemplate;
    icon = <TilesetGroup scale={1.5} group={tgTmpl} bounded />;
  }

  if (!icon) return null;

  return (
    <UnstyledButton w={32} h={32} onClick={onSpeakerClick}>
      {icon}
    </UnstyledButton>
  );
}

// Simple stub node component for story graph nodes.
// Displays the node label and exposes top/bottom handles for connections.
export default function StoryNode({ id, data, selected }: NodeProps<DNode>) {
  // Read node data from Redux so the label stays in sync when edited via
  // MilestoneEditor (which writes to Redux without going through ReactFlow's
  // internal state, just like DialogueNode does).
  const reduxNode = useAppSelector((state: RootState) =>
    state.story.nodes.find((n) => n.id === id),
  );
  const milestoneId = reduxNode?.data.id ?? data.id;

  const dialogues = useAppSelector((state: RootState) =>
    dSelectors.dialogueForMilestone(state, milestoneId),
  );

  let npcNode = null;
  if (dialogues.length > 0) {
    npcNode = (
      <Flex wrap="wrap" gap={0}>
        {dialogues.map((dlg) => (
          <Box key={dlg.id} w={32} h={32}>
            <SpeakerIcon
              objId={dlg.subjectId!}
              dialogueId={dlg.id}
              milestoneId={milestoneId}
            />
          </Box>
        ))}
      </Flex>
    );
  }

  const cls = classNames(styles.node, {
    "react-flow__node-default": true,
    [styles.selected]: selected,
  });

  return (
    <div className={cls}>
      <Handle type="target" position={Position.Top} />
      <Stack p={0}>
        {milestoneId}
        {npcNode}
      </Stack>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
