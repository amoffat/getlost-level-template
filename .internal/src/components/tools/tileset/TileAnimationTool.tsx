import { requiredNpcAnimations } from "@/constants";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { actions, selectors } from "@/slices/tilesetEditor";
import { actions as uiActions } from "@/slices/ui";
import { clearCandAnimFramesThunk } from "@/thunks/tileset";
import {
  AnimationTemplate,
  isAnimationTemplate,
  TileAnimationFrame,
} from "@/types/animation";
import { NpcRequiredAnimation } from "@/types/npc";
import { TemplateType } from "@/types/templates";
import {
  mapUiToWeight,
  mapWeightToUi,
  rebalanceAfterChange,
  type Weights,
} from "@/utils/normalizedSliders";
import { computeFrameTimes, MIN_FRAME_MS_60FPS } from "@/utils/frameTimes";
import { closestCenter, DndContext, DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ActionIcon,
  Alert,
  Button,
  Fieldset,
  Group,
  Menu,
  NumberInput,
  Slider,
  Stack,
  TagsInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import {
  IconAlertTriangle,
  IconCheck,
  IconDots,
  IconFlipHorizontal,
  IconInfoCircle,
  IconTrash,
} from "@tabler/icons-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import TileAnimation from "../../TileAnimation";
import TilesetGroup from "../../TilesetGroup";
import Tip from "../../Tip";

// Helper for the slider percent label
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

interface FormValues {
  names: string[];
}

interface TileAnimationToolProps {
  selectedAnimation?: AnimationTemplate;
}

export default function TileAnimationTool({
  selectedAnimation,
}: TileAnimationToolProps) {
  const ts = useAppSelector(selectors.activeTileset);
  const candFrames = useAppSelector(
    (state) => state.tilesetEditor.toolOptions.animator.frames,
  );
  const totalTime = useAppSelector(
    (state) => state.tilesetEditor.toolOptions.animator.totalTime,
  );
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  // Redux (candFrames) is the single source of truth for weights. These are the
  // fractional weights (0..1, summing to 1) derived straight from it.
  const candFrameWeights = useMemo(
    () => candFrames.map((f) => f.weight),
    [candFrames],
  );
  // During an active slider drag we keep a transient local "draft" so the UI
  // stays responsive without dispatching to Redux on every mousemove. It is
  // null whenever no drag is in flight, and is flushed to Redux + cleared on
  // drag end. draftRef mirrors it so onChangeEnd reads the freshest value.
  const [draftWeights, setDraftWeights] = useState<Weights | null>(null);
  const draftRef = useRef<Weights | null>(null);
  const effectiveWeights = draftWeights ?? candFrameWeights;

  const form = useForm<FormValues>({
    name: "animation",
    // We have to use a controlled form, because otherwise some fields are very
    // difficult to update correctly when the selectedAnimation changes.
    mode: "controlled",
    onSubmitPreventDefault: "always",
    initialValues: {
      names: selectedAnimation?.slotNames ?? [],
    },
    validate: {
      names: (value) =>
        value.length === 0 ? t("tileAnimValidationNames") : null,
    },
  });

  // Count how many times each required NPC animation name is used in the tileset
  const animationUseCounts = useMemo(() => {
    if (!ts) return new Map<string, number>();

    const counts = new Map<string, number>();

    // Initialize counts for all required NPC animations
    for (const animName of requiredNpcAnimations) {
      counts.set(animName, 0);
    }

    // Count occurrences in all animations
    const allObjects = Object.values(ts.tiles.entities);
    for (const obj of allObjects) {
      if (obj && isAnimationTemplate(obj)) {
        const anim = obj as AnimationTemplate;
        for (const name of anim.slotNames) {
          if (counts.has(name)) {
            counts.set(name, counts.get(name)! + 1);
          }
        }
      }
    }

    return counts;
  }, [ts]);

  const n = candFrames.length;
  const hasFrames = n > 0;

  const scaleFn = useCallback((v: number) => mapUiToWeight(v, n), [n]);
  const uiFromWeight = useCallback((t: number) => mapWeightToUi(t, n), [n]);

  const { frames, frameTimeByIdx } = useMemo(() => {
    const result = computeFrameTimes(
      n,
      effectiveWeights,
      totalTime,
      MIN_FRAME_MS_60FPS,
    );
    // Adapt to TileAnimation shape
    const framesForAnim: TileAnimationFrame[] = candFrames.map(
      (candFrame, idx) => ({
        tg: candFrame.tileGroup,
        time: result.byIdx[idx] ?? 0,
        flipX: candFrame.flipX,
      }),
    );
    return { frames: framesForAnim, frameTimeByIdx: result.byIdx };
  }, [n, candFrames, effectiveWeights, totalTime]);

  const saveAnimation = useCallback(
    (values: FormValues) => {
      const id = crypto.randomUUID();

      // Defaults
      const anim: AnimationTemplate = {
        id,
        nameKey: null,
        talkable: false,
        type: TemplateType.Animation,
        gridSize: candFrames[0]!.tileGroup.gridSize,
        frames,
        slotNames: [],
        tags: [],
        loop: true,
        autoplay: false,
        flipX: false,
        tint: null,
        hidden: false,
        groundOffset: 0,
        speakerImageId: null,
      };
      // Merge in existing properties of existing
      Object.assign(anim, selectedAnimation ?? {});
      // Set creation values
      Object.assign(anim, { slotNames: values.names, frames });

      dispatch(actions.setPaletteObjects({ tsId: ts!.id, objs: [anim] }));
      dispatch(clearCandAnimFramesThunk());
      dispatch(uiActions.setTilesetTab("animations"));
      notifications.show({
        title: t("tileAnimNotifTitle"),
        message: t("tileAnimNotifMessage", { names: values.names.join(", ") }),
        autoClose: 3000,
      });

      form.reset();
    },
    [frames, ts, candFrames, dispatch, selectedAnimation, form, t],
  );

  const formSubmit = form.onSubmit(saveAnimation);

  // Derived state: sync form names when the selected animation changes.
  const [prevAnimId, setPrevAnimId] = useState(selectedAnimation?.id);
  if (prevAnimId !== selectedAnimation?.id) {
    setPrevAnimId(selectedAnimation?.id);
    form.setFieldValue("names", selectedAnimation?.slotNames ?? []);
  }

  // Rebalance all weights when a single slider is changed so that the sum
  // across frames remains exactly 1.0. We preserve other frames' relative
  // proportions by scaling them uniformly. Updates only the transient draft;
  // Redux is flushed on drag end via flushWeights.
  const updateWeight = (idx: number, target: number) => {
    const base = draftRef.current ?? candFrameWeights;
    const next: Weights =
      base.length === 0 ? [1] : rebalanceAfterChange(base.slice(), idx, target);
    draftRef.current = next;
    setDraftWeights(next);
  };

  // Flush the in-progress draft to Redux and release it (Redux is authoritative
  // again). Called on slider drag end.
  const flushWeights = () => {
    if (draftRef.current) {
      dispatch(actions.updateAllCandAnimFrameWeights(draftRef.current));
    }
    draftRef.current = null;
    setDraftWeights(null);
  };

  const toggleFlipFrame = (idx: number) => {
    dispatch(actions.toggleCandAnimFrameFlipX(idx));
  };

  const removeFrame = (idx: number) => {
    const id = candFrames[idx].tileGroup.id;
    const numIdsInFrames = candFrames.reduce((acc, candFrame) => {
      return acc + (candFrame.tileGroup.id === id ? 1 : 0);
    }, 0);
    if (numIdsInFrames <= 1) {
      dispatch(actions.removeOneSelected(id));
    }
    // The reducer rebalances the remaining frames' weights in Redux.
    dispatch(actions.removeCandAnimIdx(idx));
  };

  const hasAllNpcAnims = useMemo(() => {
    for (const animName of requiredNpcAnimations) {
      const count = animationUseCounts.get(animName) ?? 0;
      if (count <= 0) return false;
    }
    return true;
  }, [animationUseCounts]);

  const tips: string[] = useMemo(() => {
    const tipItems: string[] = [];
    if (candFrames.length === 0) {
      tipItems.push(t("tileAnimTipSelectTiles"));
      tipItems.push(t("tileAnimTipSameSize"));
    } else {
      tipItems.push(t("tileAnimTipAdjustSliders"));
      tipItems.push(t("tileAnimTipDragReorder"));
      tipItems.push(t("tileAnimTipDuplicate"));
    }

    if (hasAllNpcAnims) {
      tipItems.push(t("tileAnimTipCreateNpc"));
    }

    return tipItems;
  }, [candFrames, hasAllNpcAnims, t]);

  const canSave = hasFrames;

  return (
    <>
      <Tip tips={tips} />
      <form onSubmit={formSubmit}>
        <Fieldset legend={t("tileAnimLegend")} p="xs">
          <Stack p={0} gap="xs">
            {!hasFrames && (
              <Alert
                title={t("tileAnimAlertNoPreviewTitle")}
                variant="light"
                icon={<IconInfoCircle />}
              >
                {t("tileAnimAlertNoPreviewMsg")}
              </Alert>
            )}
            <TileAnimation frames={frames} scale={5} bounded />

            <DndContext
              collisionDetection={closestCenter}
              onDragEnd={(event: DragEndEvent) => {
                const { active, over } = event;
                if (!over || active.id === over.id) return;
                const from = Number(active.id);
                const to = Number(over.id);
                if (!Number.isInteger(from) || !Number.isInteger(to)) return;
                // Each frame carries its own weight, so the reducer moves the
                // weight along with the frame — no separate local update needed.
                dispatch(actions.reorderCandAnimFrames({ from, to }));
              }}
            >
              <SortableContext
                // Use indices as item ids to support duplicate TileGroup ids
                items={candFrames.map((_, i) => String(i))}
                strategy={verticalListSortingStrategy}
              >
                {candFrames.map((candFrame, idx) => {
                  const w = effectiveWeights[idx] ?? 0;
                  const uiValue = uiFromWeight(w);

                  return (
                    <SortableFrame
                      key={`${candFrame.tileGroup.id}-${idx}`}
                      id={String(idx)}
                      idx={idx}
                      cand={candFrame.tileGroup}
                      uiValue={uiValue}
                      onChange={(v) => {
                        const targetWeight = scaleFn(v);
                        updateWeight(idx, targetWeight);
                      }}
                      onChangeEnd={flushWeights}
                      labelMs={frameTimeByIdx[idx]}
                      totalTime={totalTime}
                      scaleFn={scaleFn}
                      removeFrame={removeFrame}
                      toggleFlipFrame={toggleFlipFrame}
                      flipX={candFrame.flipX}
                      disabled={candFrames.length <= 1}
                    />
                  );
                })}
              </SortableContext>
            </DndContext>

            <NumberInput
              label={t("tileAnimTotalTimeLabel")}
              placeholder="1000"
              min={1}
              step={50}
              value={totalTime}
              suffix="ms"
              onChange={(v) => {
                const time = (typeof v === "number" ? v : Number(v)) || 0;
                dispatch(actions.setCandAnimTotalTime(time));
              }}
              disabled={!hasFrames}
            />

            <TagsInput
              label={t("tileAnimNamesLabel")}
              description={t("tileAnimNamesDesc")}
              placeholder={t("tileAnimNamesPlaceholder")}
              splitChars={[",", " ", "|"]}
              limit={5}
              data={[
                {
                  group: t("tileAnimRequiredForNpcs"),
                  items: [...requiredNpcAnimations],
                },
              ]}
              renderOption={(item) => {
                const label = item.option.value;
                const isNpcAnim = requiredNpcAnimations.includes(
                  label as NpcRequiredAnimation,
                );
                if (!isNpcAnim) {
                  return label;
                }
                const count = animationUseCounts.get(label) ?? 0;
                return (
                  <Group gap="xs" wrap="nowrap">
                    {count > 0 ? (
                      <IconCheck size={14} color="green" />
                    ) : (
                      <IconAlertTriangle size={16} color="orange" />
                    )}
                    <span>{label}</span>
                  </Group>
                );
              }}
              {...form.getInputProps("names")}
            />

            <Button
              mt="lg"
              variant="filled"
              fullWidth
              disabled={!canSave}
              type="submit"
            >
              {t("tileAnimSaveBtn")}
            </Button>
          </Stack>
        </Fieldset>
      </form>
    </>
  );
}

type SortableFrameProps = {
  id: string; // sortable id (index as string)
  idx: number; // current index into weights/time arrays
  cand: any; // TileGroup (avoid import cycles in this file)
  uiValue: number;
  onChange: (v: number) => void;
  onChangeEnd: () => void;
  labelMs: number | undefined;
  totalTime: number;
  scaleFn: (v: number) => number;
  removeFrame: (idx: number) => void;
  toggleFlipFrame: (idx: number) => void;
  flipX: boolean;
  disabled: boolean;
};

function SortableFrame({
  id,
  idx,
  cand,
  uiValue,
  onChange,
  onChangeEnd,
  labelMs,
  totalTime,
  scaleFn,
  removeFrame,
  toggleFlipFrame,
  flipX,
  disabled,
}: SortableFrameProps) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Group ref={setNodeRef} align="center" gap="xs" wrap="nowrap" style={style}>
      {/* Make the TilesetGroup the drag handle */}
      <TilesetGroup
        group={cand}
        scale={2}
        style={{ cursor: "grab" }}
        {...attributes}
        {...listeners}
      />
      <Slider
        size="sm"
        flex={1}
        min={0}
        max={1}
        step={0.01}
        scale={scaleFn}
        value={uiValue}
        onChange={onChange}
        onChangeEnd={onChangeEnd}
        label={(scaledWeight) => {
          const clamped = clamp01(scaledWeight);
          const ms = labelMs;
          const showMs =
            typeof ms === "number" ? ms : Math.round(clamped * totalTime);
          return `${Math.round(clamped * 100)}% (${showMs}ms)`;
        }}
        disabled={disabled}
      />
      <Menu position="bottom-end" withinPortal shadow="md">
        <Menu.Target>
          <ActionIcon
            size="xs"
            variant={flipX ? "light" : "subtle"}
            aria-label={t("tileAnimFrameMenu")}
          >
            <IconDots size={14} />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Item
            leftSection={<IconFlipHorizontal size={14} />}
            onClick={() => toggleFlipFrame(idx)}
          >
            {flipX ? t("tileAnimFrameUnflip") : t("tileAnimFrameFlip")}
          </Menu.Item>
          <Menu.Item
            color="red"
            leftSection={<IconTrash size={14} />}
            onClick={() => removeFrame(idx)}
          >
            {t("tileAnimFrameDelete")}
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </Group>
  );
}
