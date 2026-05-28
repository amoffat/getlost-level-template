import { useAppSelector } from "@/hooks/redux";
import { selectors as localeSelectors } from "@/slices/locale";
import { selectors as mapSelectors } from "@/slices/mapEditor";
import { MilestoneWaypoint } from "@/slices/story";
import { selectors as tsSelectors } from "@/slices/tilesetEditor";
import { selectPropertyValue } from "@/store/selectors";
import { store } from "@/store/store";
import type { NpcTemplate } from "@/types/npc";
import type { TileGroupTemplate } from "@/types/tilegroup";
import { resolveLocaleText } from "@/utils/locale";
import {
  Button,
  Group,
  Modal,
  Select,
  Slider,
  Stack,
  Text,
} from "@mantine/core";
import { isNotEmpty, useForm } from "@mantine/form";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import TilesetGroup from "./TilesetGroup";

// Logarithmic speed scale: internal 0–1 maps to external 0.1–10
// scale(0)   = 0.1,  scale(0.5) = 1.0,  scale(1) = 10
const minSpeed = 0.1;
const maxSpeed = 10;
const scaleSpeed = (v: number) =>
  parseFloat((minSpeed * Math.pow(maxSpeed / minSpeed, v)).toFixed(3));
const inverseScaleSpeed = (speed: number) =>
  Math.log(speed / minSpeed) / Math.log(maxSpeed / minSpeed);

const DEFAULT_SPEED = 1.0;
const DEFAULT_SLIDER_VALUE = inverseScaleSpeed(DEFAULT_SPEED); // 0.5

const SPEED_MARKS = [
  { value: 0, label: minSpeed },
  { value: DEFAULT_SLIDER_VALUE, label: "1" },
  { value: 1, label: maxSpeed },
];

interface WaypointLinkModalProps {
  opened: boolean;
  onClose: () => void;
  onSave: (wp: MilestoneWaypoint) => void;
  /** Values to pre-populate when editing an existing entry. */
  initialValues?: MilestoneWaypoint;
  /**
   * Character IDs already linked to this milestone.
   * The modal excludes these from the character dropdown, unless one of them
   * matches `initialValues.characterId` (i.e. we're editing that entry).
   */
  usedCharacterIds: string[];
}

export default function WaypointLinkModal({
  opened,
  onClose,
  onSave,
  initialValues,
  usedCharacterIds,
}: WaypointLinkModalProps) {
  const { t } = useTranslation();
  const title = initialValues
    ? t("waypointLinkModalEditTitle")
    : t("waypointLinkModalAddTitle");

  return (
    <Modal opened={opened} onClose={onClose} title={title} centered>
      {opened && (
        <WaypointLinkForm
          onClose={onClose}
          onSave={onSave}
          initialValues={initialValues}
          usedCharacterIds={usedCharacterIds}
        />
      )}
    </Modal>
  );
}

interface WaypointLinkFormProps {
  onClose: () => void;
  onSave: (wp: MilestoneWaypoint) => void;
  initialValues?: MilestoneWaypoint;
  usedCharacterIds: string[];
}

function WaypointLinkForm({
  onClose,
  onSave,
  initialValues,
  usedCharacterIds,
}: WaypointLinkFormProps) {
  const { t } = useTranslation();
  const defaultLocaleEntries = useAppSelector(
    localeSelectors.selectDefaultEntries,
  );

  const npcs = useAppSelector(mapSelectors.selectNpcs);
  const waypoints = useAppSelector(mapSelectors.selectWaypoints);

  const form = useForm({
    initialValues: {
      characterId: (initialValues?.characterId ?? null) as string | null,
      waypointId: (initialValues?.waypointId ?? null) as string | null,
      sliderValue:
        initialValues?.speed != null
          ? inverseScaleSpeed(initialValues.speed)
          : DEFAULT_SLIDER_VALUE,
    },
    validate: {
      characterId: isNotEmpty(t("waypointLinkModalCharacterRequired")),
      waypointId: isNotEmpty(t("waypointLinkModalWaypointRequired")),
    },
  });

  // Precompute WalkDown first-frame for each NPC
  const walkDownFrames = useMemo(() => {
    const state = store.getState();
    const map = new Map<string, TileGroupTemplate | null>();
    for (const npc of npcs) {
      const template = tsSelectors.templateFromId(
        state,
        npc.tsObjId,
      ) as NpcTemplate | null;
      const tg =
        template?.animations["WalkDown"]?.animation.frames[0]?.tg ?? null;
      map.set(npc.id, tg);
    }
    return map;
  }, [npcs]);

  const editingCharacterId = initialValues?.characterId ?? null;

  const characterData = useMemo(() => {
    const usedSet = new Set(usedCharacterIds);
    const state = store.getState();

    return npcs
      .filter((npc) => {
        if (npc.id === editingCharacterId) return true;
        return !usedSet.has(npc.id);
      })
      .map((npc) => ({
        value: npc.id,
        label: resolveLocaleText({
          key: selectPropertyValue(state, npc, "nameKey"),
          primaryEntries: defaultLocaleEntries,
          defaultText: npc.id,
        }),
      }));
  }, [usedCharacterIds, npcs, editingCharacterId, defaultLocaleEntries]);

  const waypointData = waypoints.map((wp) => ({
    value: wp.id,
    label: wp.slug ?? wp.id,
  }));

  const handleSave = form.onSubmit((values) => {
    onSave({
      characterId: values.characterId!,
      waypointId: values.waypointId!,
      speed: scaleSpeed(values.sliderValue),
    });
    onClose();
  });

  return (
    <form onSubmit={handleSave}>
      <Stack gap="md">
        <Select
          label={t("waypointLinkModalCharacterLabel")}
          description={t("waypointLinkModalCharacterDescription")}
          placeholder={t("waypointLinkModalCharacterPlaceholder")}
          data={characterData}
          searchable
          renderOption={({ option }) => {
            const tg = walkDownFrames.get(option.value) ?? null;
            return (
              <Group gap="xs" wrap="nowrap">
                {tg && <TilesetGroup scale={1.5} group={tg} bounded={false} />}
                <Text size="sm">{option.label}</Text>
              </Group>
            );
          }}
          {...form.getInputProps("characterId")}
        />

        <Select
          label={t("waypointLinkModalWaypointLabel")}
          description={t("waypointLinkModalWaypointDescription")}
          placeholder={t("waypointLinkModalWaypointPlaceholder")}
          data={waypointData}
          searchable
          {...form.getInputProps("waypointId")}
        />

        <Stack gap={4}>
          <Text size="sm" fw={500}>
            {t("waypointLinkModalSpeedLabel")}
          </Text>
          <Text size="xs" c="dimmed">
            {t("waypointLinkModalSpeedDescription")}
          </Text>
          <Slider
            min={0}
            max={1}
            step={0.01}
            scale={scaleSpeed}
            label={(scaledVal) => scaledVal.toFixed(2)}
            marks={SPEED_MARKS}
            mb="md"
            {...form.getInputProps("sliderValue")}
          />
        </Stack>

        <Button fullWidth type="submit">
          {t("waypointLinkModalSaveBtn")}
        </Button>
      </Stack>
    </form>
  );
}
