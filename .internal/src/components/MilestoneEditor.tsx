import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { useWaypointModal } from "@/contexts/WaypointModalContext";
import { selectors as dSelectors } from "@/slices/dialogue";
import { selectors as localeSelectors } from "@/slices/locale";
import { selectors as mapSelectors } from "@/slices/mapEditor";
import { MilestoneWaypoint, setNodeData, StoryNodeData } from "@/slices/story";
import { selectors as tsSelectors } from "@/slices/tilesetEditor";
import { selectPropertyValue } from "@/store/selectors";
import { RootState, store } from "@/store/store";
import { Dialogue } from "@/types/dialogue";
import { NpcInstance, SpeakableMapObj, WaypointObj } from "@/types/map";
import type { NpcTemplate } from "@/types/npc";
import { createUrlPath } from "@/utils/dialogue";
import { resolveLocaleText } from "@/utils/locale";
import { sanitize } from "@/utils/slug";
import {
  ActionIcon,
  Button,
  Checkbox,
  Fieldset,
  Group,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useDebouncedCallback } from "@mantine/hooks";
import {
  IconArrowNarrowRight,
  IconPencil,
  IconTrash,
} from "@tabler/icons-react";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import FieldsetLegend from "./FieldsetLegend";
import TilesetGroup from "./TilesetGroup";

interface MilestoneEditorProps {
  nodeId: string;
  autoFocus?: boolean;
}

/**
 * Editing panel for a selected story milestone node.
 * Renders in the right pane of the StoryTab.
 */
export default function MilestoneEditor({
  nodeId,
  autoFocus,
}: MilestoneEditorProps) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { openWaypointModal } = useWaypointModal();

  const node = useAppSelector((state: RootState) =>
    state.story.nodes.find((n) => n.id === nodeId),
  );

  // data.id is the human-readable milestone name shown in the UI.
  // node.id (nodeId) is the stable UUID used for dialogue linkage.
  const milestoneId = node?.data.id ?? "";

  // Collect all other milestone IDs for uniqueness checking
  const otherMilestoneIds = useAppSelector((state: RootState) =>
    state.story.nodes.filter((n) => n.id !== nodeId).map((n) => n.data.id),
  );
  const otherIdsSet = useMemo(
    () => new Set(otherMilestoneIds),
    [otherMilestoneIds],
  );

  const [localName, setLocalName] = useState(milestoneId);
  const isEmpty = localName === "";
  const isDuplicate = !isEmpty && otherIdsSet.has(localName);

  const dialogues = useAppSelector((state: RootState) =>
    dSelectors.dialogueForMilestone(state, nodeId),
  );

  const waypoints: MilestoneWaypoint[] = node?.data.waypoints ?? [];

  const debouncedDispatch = useDebouncedCallback(
    (data: Partial<StoryNodeData>) => {
      dispatch(setNodeData({ id: nodeId, data }));
    },
    300,
  );

  const onNameChange = useCallback(
    (value: string) => {
      const sanitized = sanitize(value);
      setLocalName(sanitized);
      // Only persist if non-empty and unique
      if (sanitized !== "" && !otherIdsSet.has(sanitized)) {
        debouncedDispatch({ id: sanitized });
      }
    },
    [otherIdsSet, debouncedDispatch],
  );

  const onPermanentChange = useCallback(
    (permanent: boolean) => {
      debouncedDispatch({ permanent });
    },
    [debouncedDispatch],
  );

  const onDeleteWaypoint = useCallback(
    (characterId: string) => {
      const existing = node?.data.waypoints ?? [];
      const updated = existing.filter((w) => w.characterId !== characterId);
      dispatch(setNodeData({ id: nodeId, data: { waypoints: updated } }));
    },
    [dispatch, nodeId, node],
  );

  if (!node) {
    return (
      <Stack align="center" justify="center" style={{ height: "100%" }}>
        <Text size="sm" c="dimmed">
          Select a milestone node to edit its properties.
        </Text>
      </Stack>
    );
  }

  const nameError = isEmpty
    ? "Name cannot be empty."
    : isDuplicate
      ? "This milestone name is already in use."
      : undefined;

  return (
    <>
      <Fieldset legend="Milestone Details" p="xs">
        <Stack p={0} gap="md">
          <TextInput
            label="Name"
            description="A name to reference this milestone. Must be unique."
            required
            value={localName}
            onChange={(e) => onNameChange(e.currentTarget.value)}
            error={nameError}
            autoFocus={autoFocus}
            onFocus={(e) => e.currentTarget.select()}
          />
          <Checkbox
            label="Permanent"
            description="Should this become part of the player's permanent action history?"
            defaultChecked={node.data.permanent ?? false}
            onChange={(e) => onPermanentChange(e.currentTarget.checked)}
          />
        </Stack>
      </Fieldset>

      {dialogues.length > 0 && (
        <Fieldset
          legend={
            <FieldsetLegend
              legendKey="milestoneEditorDialoguesLegend"
              infoKey="milestoneEditorDialoguesInfo"
            />
          }
          p="xs"
        >
          <Stack p={0} gap="xs">
            {dialogues.map((dlg) => (
              <DialogueRow
                key={dlg.id}
                dialogue={dlg}
                milestoneNodeId={nodeId}
                onNavigate={(path) => navigate(path)}
              />
            ))}
          </Stack>
        </Fieldset>
      )}

      <Fieldset
        legend={
          <FieldsetLegend
            legendKey="milestoneEditorWaypointsLegend"
            infoKey="milestoneEditorWaypointsInfo"
          />
        }
        p="xs"
      >
        <Stack p={0} gap="xs">
          {waypoints.map((wp) => (
            <WaypointRow
              key={wp.characterId}
              waypoint={wp}
              onEdit={() => openWaypointModal(nodeId, wp)}
              onDelete={() => onDeleteWaypoint(wp.characterId)}
            />
          ))}
          <Button
            variant="light"
            size="xs"
            onClick={() => openWaypointModal(nodeId, null)}
            fullWidth
          >
            {t("milestoneEditorAddWaypointPair")}
          </Button>
        </Stack>
      </Fieldset>
    </>
  );
}

function DialogueRow({
  dialogue,
  milestoneNodeId,
  onNavigate,
}: {
  dialogue: Dialogue;
  milestoneNodeId: string;
  onNavigate: (path: string) => void;
}) {
  const { t } = useTranslation();
  const obj = useAppSelector((state: RootState) =>
    dialogue.subjectId
      ? mapSelectors.selectObject(state, dialogue.subjectId)
      : undefined,
  ) as SpeakableMapObj | undefined;

  const name = obj?.nameKey ? t(obj.nameKey) : dialogue.id;
  const path = createUrlPath({ id: dialogue.id, milestone: milestoneNodeId });

  return (
    <Group gap="xs" wrap="nowrap">
      <Text size="sm" style={{ flex: 1 }}>
        {name}
      </Text>
      <Button variant="subtle" size="xs" onClick={() => onNavigate(path)}>
        Edit
      </Button>
    </Group>
  );
}

function WaypointRow({
  waypoint,
  onEdit,
  onDelete,
}: {
  waypoint: MilestoneWaypoint;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const defaultLocaleEntries = useAppSelector(
    localeSelectors.selectDefaultEntries,
  );

  const npc = useAppSelector((state: RootState) =>
    mapSelectors.selectObject(state, waypoint.characterId),
  ) as NpcInstance | undefined;

  const wp = useAppSelector((state: RootState) =>
    mapSelectors.selectObject(state, waypoint.waypointId),
  ) as WaypointObj | undefined;

  const walkDownFrame = useMemo(() => {
    if (!npc) return null;
    const state = store.getState();
    const template = tsSelectors.templateFromId(
      state,
      npc.tsObjId,
    ) as NpcTemplate | null;
    if (!template) return null;
    return template.animations["WalkDown"]!.animation.frames[0].tg;
  }, [npc]);

  const characterLabel = useMemo(() => {
    if (!npc) return waypoint.characterId;
    const state = store.getState();
    return resolveLocaleText({
      key: selectPropertyValue(state, npc, "nameKey"),
      primaryEntries: defaultLocaleEntries,
      defaultText: npc.id,
    });
  }, [npc, defaultLocaleEntries, waypoint.characterId]);

  const waypointLabel = wp?.slug ?? wp?.id ?? waypoint.waypointId;

  return (
    <Group gap="xs" wrap="nowrap">
      {walkDownFrame && (
        <TilesetGroup scale={1.2} group={walkDownFrame} bounded />
      )}
      <Text size="sm" style={{ flex: 1 }}>
        <Group gap="xs">
          {characterLabel}
          <IconArrowNarrowRight size="1.5em" />
          {waypointLabel}
        </Group>
      </Text>
      <ActionIcon
        variant="subtle"
        size="xs"
        onClick={onEdit}
        aria-label={t("milestoneEditorEditWaypointLink")}
      >
        <IconPencil />
      </ActionIcon>
      <ActionIcon
        variant="subtle"
        size="xs"
        color="red"
        onClick={onDelete}
        aria-label={t("milestoneEditorDeleteWaypointLink")}
      >
        <IconTrash />
      </ActionIcon>
    </Group>
  );
}
