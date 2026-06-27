import { playerParticipantId, storyOriginNodeId } from "@/constants";
import { ParticipantAvatar } from "@/components/dialogue/Participant";
import { useAncestorHighlight } from "@/contexts/AncestorHighlightContext";
import { useWaypointModal } from "@/contexts/WaypointModalContext";
import { useAppSelector } from "@/hooks/redux";
import { selectors as dSelectors } from "@/slices/dialogue";
import { selectors as mapSelectors } from "@/slices/mapEditor";
import { MilestoneWaypoint, type StoryNode as DNode } from "@/slices/story";
import { selectors as tsSelectors } from "@/slices/tilesetEditor";
import type { RootState } from "@/store/store";
import { isNpcInstance, isTileGroupInstance, type MapObj } from "@/types/map";
import { NpcRequiredAnimation, NpcTemplate } from "@/types/npc";
import { TileGroupTemplate } from "@/types/tilegroup";
import { createUrlPath, participantsOf } from "@/utils/dialogue";
import { Box, Flex, Group, Stack, UnstyledButton } from "@mantine/core";
import {
  IconInfinity,
  IconMapPin,
  IconMessageFilled,
} from "@tabler/icons-react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import classNames from "classnames";
import { useCallback } from "react";
import { useNavigate } from "react-router";
import TileAnimation from "../TileAnimation";
import TilesetGroup from "../TilesetGroup";
import styles from "./styles/StoryNode.module.css";

function CharacterIcon({
  objId,
  onClick,
  animation,
}: {
  objId: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  animation?: NpcRequiredAnimation;
}) {
  const obj = useAppSelector((state: RootState) =>
    mapSelectors.selectObject(state, objId),
  ) as MapObj | undefined;

  const tmpl = useAppSelector((state: RootState) => {
    if (!obj) return null;
    if (!isNpcInstance(obj) && !isTileGroupInstance(obj)) return null;
    return tsSelectors.templateFromId(state, obj.tsObjId);
  });

  if (!obj || !tmpl) return null;

  let icon;
  if (isNpcInstance(obj)) {
    const npcTmpl = tmpl as NpcTemplate;
    if (animation) {
      const npcAnim = npcTmpl.animations[animation];
      icon = (
        <TileAnimation
          scale={1.5}
          frames={npcAnim.animation.frames}
          flipX={npcAnim.flipX}
          bounded
        />
      );
    } else {
      const tg = npcTmpl.animations.Idle.animation.frames[0]!.tg;
      icon = <TilesetGroup scale={1.5} group={tg} bounded />;
    }
  } else if (isTileGroupInstance(obj)) {
    const tgTmpl = tmpl as TileGroupTemplate;
    icon = <TilesetGroup scale={1.5} group={tgTmpl} bounded />;
  }

  if (!icon) return null;

  return (
    <UnstyledButton w={32} h={32} onClick={onClick}>
      {icon}
    </UnstyledButton>
  );
}

// Simple stub node component for story graph nodes.
// Displays the node label and exposes top/bottom handles for connections.
export default function StoryNode({ id, data, selected }: NodeProps<DNode>) {
  const { nodeIds: ancestorNodeIds } = useAncestorHighlight();
  const { openWaypointModal } = useWaypointModal();
  const navigate = useNavigate();

  // Read node data from Redux so the label stays in sync when edited via
  // MilestoneEditor (which writes to Redux without going through ReactFlow's
  // internal state, just like DialogueNode does).
  const reduxNode = useAppSelector((state: RootState) =>
    state.story.nodes.find((n) => n.id === id),
  );
  // data.id is the human-readable milestone name; use it only for display.
  const milestoneName = reduxNode?.data.id ?? data.id;

  // Use the stable ReactFlow node UUID for dialogue lookups and navigation.
  const dialogues = useAppSelector((state: RootState) =>
    dSelectors.dialogueForMilestone(state, id),
  );

  const waypoints: MilestoneWaypoint[] = reduxNode?.data.waypoints ?? [];

  const onWaypointIconClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>, wp: MilestoneWaypoint) => {
      e.stopPropagation();
      openWaypointModal(id, wp);
    },
    [openWaypointModal, id],
  );

  const hasIcons = dialogues.length > 0 || waypoints.length > 0;
  const icons = hasIcons ? (
    <Flex wrap="wrap" gap={0}>
      {dialogues.flatMap((dlg) => {
        // Multi-participant dialogues have no single subject. Show every
        // character involved; for a pure player monologue, fall back to the
        // player so the dialogue is still represented on the milestone.
        const all = [...participantsOf(dlg)];
        const nonPlayer = all.filter((p) => p !== playerParticipantId);
        const shown = nonPlayer.length > 0 ? nonPlayer : all;
        return shown.map((pid) => (
          <Box
            key={`${dlg.id}:${pid}`}
            w={32}
            h={32}
            style={{ position: "relative" }}
          >
            <IconMessageFilled className={styles.speechBubble} size="16" />
            <UnstyledButton
              w={32}
              h={32}
              onClick={(e) => {
                e.stopPropagation();
                navigate(createUrlPath({ id: dlg.id }));
              }}
            >
              <ParticipantAvatar participantId={pid} scale={1.5} size={32} />
            </UnstyledButton>
          </Box>
        ));
      })}
      {waypoints.map((wp) => (
        <Box
          key={wp.characterId}
          w={32}
          h={32}
          style={{ position: "relative" }}
        >
          <IconMapPin className={styles.speechBubble} size="16" />
          <CharacterIcon
            objId={wp.characterId}
            animation="WalkUp"
            onClick={(e) => onWaypointIconClick(e, wp)}
          />
        </Box>
      ))}
    </Flex>
  ) : null;

  const isPermanent = reduxNode?.data.permanent === true;
  const isOrigin = id === storyOriginNodeId;

  const cls = classNames(styles.node, {
    "react-flow__node-default": true,
    [styles.selected]: selected,
    [styles.ancestorHighlight]: !selected && ancestorNodeIds.has(id),
    [styles.origin]: isOrigin,
  });

  return (
    <div className={cls}>
      {!isOrigin && <Handle type="target" position={Position.Top} />}
      <Stack p={0} align="center">
        <Group gap={4} wrap="nowrap">
          {milestoneName}
          {isPermanent && <IconInfinity color="gold" />}
        </Group>
        {icons}
      </Stack>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
