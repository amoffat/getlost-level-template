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
  reorderWeights,
  type Weights,
} from "@/utils/normalizedSliders";
import { closestCenter, DndContext, DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Alert,
  Button,
  CloseButton,
  Fieldset,
  Group,
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
  IconInfoCircle,
} from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import TileAnimation from "../../TileAnimation";
import TilesetGroup from "../../TilesetGroup";
import Tip from "../../Tip";

const MIN_FRAME_MS_60FPS = Math.ceil(1000 / 60); // ~16.7ms

// Types for frame time calculation
type FrameMsMap = number[]; // per-frame time in ms by index

// Helpers for frame time calculation
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

function getMinPer(totalTime: number, activeCount: number, minFrameMs: number) {
  if (activeCount <= 0) return 0;
  return Math.max(0, Math.min(minFrameMs, Math.floor(totalTime / activeCount)));
}

// Largest remainder rounding while honoring minPer per active frame
function computeFrameTimes(
  count: number,
  weights: Weights,
  totalTime: number,
  minFrameMs: number,
): { frames: { idx: number; time: number }[]; byIdx: FrameMsMap } {
  const eps = 1e-9;
  const indices = Array.from({ length: count }, (_, i) => i);
  const active = indices.filter((i) => (weights[i] ?? 0) > eps);
  const k = active.length;

  const byIdx: FrameMsMap = Array(count).fill(0);
  const frames: { idx: number; time: number }[] = [];

  if (count === 0 || totalTime <= 0) return { frames, byIdx };
  if (k === 0) {
    for (let i = 0; i < count; i++) byIdx[i] = 0;
    for (let i = 0; i < count; i++) frames.push({ idx: i, time: 0 });
    return { frames, byIdx };
  }

  const minPer = getMinPer(totalTime, k, minFrameMs);
  const totalMin = minPer * k;
  const remaining = Math.max(0, totalTime - totalMin);

  let sumActiveW = 0;
  for (const i of active) sumActiveW += weights[i] ?? 0;

  // Exact values before rounding
  const exacts: number[] = Array(count).fill(0);
  if (remaining <= 0) {
    for (let i = 0; i < count; i++) exacts[i] = active.includes(i) ? minPer : 0;
  } else if (sumActiveW <= eps) {
    const extra = remaining / k;
    for (let i = 0; i < count; i++)
      exacts[i] = active.includes(i) ? minPer + extra : 0;
  } else {
    for (let i = 0; i < count; i++) {
      const w = weights[i] ?? 0;
      exacts[i] = w > eps ? minPer + (w / sumActiveW) * remaining : 0;
    }
  }

  // Largest remainder method
  let sumFloor = 0;
  const floors: number[] = Array(count).fill(0);
  const fracs: { idx: number; frac: number }[] = [];
  for (let i = 0; i < count; i++) {
    const exact = exacts[i] ?? 0;
    const f = Math.floor(exact);
    floors[i] = f;
    sumFloor += f;
    fracs.push({ idx: i, frac: exact - f });
  }
  let diff = totalTime - sumFloor;
  if (diff > 0) {
    fracs.sort((a, b) => b.frac - a.frac);
    for (let j = 0; j < fracs.length && diff > 0; j++) {
      const { idx } = fracs[j];
      // Only add to active frames (inactive get 0)
      if ((weights[idx] ?? 0) > eps) {
        floors[idx] = (floors[idx] ?? 0) + 1;
        diff -= 1;
      }
    }
  }

  for (let i = 0; i < count; i++) byIdx[i] = Math.max(0, floors[i] ?? 0);
  for (let i = 0; i < count; i++) frames.push({ idx: i, time: byIdx[i] });
  return { frames, byIdx };
}

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
  // Store fractional weights per frame (0..1), always normalized so sum == 1
  // Local state for responsive slider interaction
  const [weights, setWeights] = useState<Weights>([]);

  const form = useForm<FormValues>({
    name: "animation",
    // We have to use a controlled form, because otherwise some fields are very
    // difficult to update correctly when the selectedAnimation changes.
    mode: "controlled",
    onSubmitPreventDefault: "always",
    initialValues: {
      names: selectedAnimation?.names ?? [],
    },
    validate: {
      names: (value) =>
        value.length === 0 ? "Please enter at least one animation name." : null,
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
        for (const name of anim.names) {
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
    const result = computeFrameTimes(n, weights, totalTime, MIN_FRAME_MS_60FPS);
    // Adapt to TileAnimation shape
    const framesForAnim: TileAnimationFrame[] = candFrames.map(
      (candFrame, idx) => ({
        tg: candFrame.tileGroup,
        time: result.byIdx[idx] ?? 0,
      }),
    );
    return { frames: framesForAnim, frameTimeByIdx: result.byIdx };
  }, [n, candFrames, weights, totalTime]);

  const saveAnimation = useCallback(
    (values: FormValues) => {
      const id = crypto.randomUUID();

      // Defaults
      const anim: AnimationTemplate = {
        id,
        type: TemplateType.Animation,
        tilesetId: ts!.id,
        gridSize: candFrames[0]!.tileGroup.gridSize,
        frames,
        names: [],
        tags: [],
        loop: true,
        flipX: false,
        tint: null,
        hidden: false,
        groundOffset: 0,
      };
      // Merge in existing properties of existing
      Object.assign(anim, selectedAnimation ?? {});
      // Set creation values
      Object.assign(anim, { names: values.names });

      dispatch(actions.setPaletteObjects({ tsId: ts!.id, objs: [anim] }));
      dispatch(clearCandAnimFramesThunk());
      dispatch(uiActions.setTilesetTab("animations"));
      notifications.show({
        title: "Animation saved",
        message: `Saved animation "${values.names.join(", ")}".`,
        autoClose: 3000,
      });

      form.reset();
    },
    [frames, ts, candFrames, dispatch, selectedAnimation, form],
  );

  const formSubmit = form.onSubmit(saveAnimation);

  // Sync weights when frame count changes (not on every weight update)
  // Initialize from Redux weights when frames are added/removed
  useEffect(() => {
    setWeights(candFrames.map((f) => f.weight));
  }, [candFrames]);

  // Update form names when selectedAnimation changes
  useEffect(() => {
    const names = selectedAnimation?.names ?? [];
    form.setFieldValue("names", names);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAnimation]);

  // Rebalance all weights when a single slider is changed so that the sum
  // across frames remains exactly 1.0. We preserve other frames' relative
  // proportions by scaling them uniformly.
  const updateWeight = (idx: number, target: number) => {
    setWeights((prev) => {
      if (prev.length === 0) return [1];
      const current: Weights = prev.slice();
      return rebalanceAfterChange(current, idx, target);
    });
  };

  const removeFrame = (idx: number) => {
    const id = candFrames[idx].tileGroup.id;
    const numIdsInFrames = candFrames.reduce((acc, candFrame) => {
      return acc + (candFrame.tileGroup.id === id ? 1 : 0);
    }, 0);
    if (numIdsInFrames <= 1) {
      dispatch(actions.removeOneSelected(id));
    }
    dispatch(actions.removeCandAnimIdx(idx));
    // Local weights will be updated via useEffect when Redux state changes
  };

  const hasAllNpcAnims = useMemo(() => {
    for (const animName of requiredNpcAnimations) {
      const count = animationUseCounts.get(animName) ?? 0;
      if (count <= 0) return false;
    }
    return true;
  }, [animationUseCounts]);

  const tips: string[] = useMemo(() => {
    const t = [];
    if (candFrames.length === 0) {
      t.push("Select tiles that you want to see in your animation.");
      t.push("You may only select objects that are the same size.");
    } else {
      t.push(
        "Adjust the sliders to set how long each frame appears in the animation.",
      );
      t.push("Drag the frame to reorder it in the animation sequence.");
      t.push(
        "You can duplicate a frame by clicking the same tile again in the tile editor.",
      );
    }

    if (hasAllNpcAnims) {
      t.push(
        "When all required NPC animations are present, you can create an NPC with the NPC tool.",
      );
    }

    return t;
  }, [candFrames, hasAllNpcAnims]);

  const canSave = hasFrames;

  return (
    <>
      <Tip tips={tips} />
      <form onSubmit={formSubmit}>
        <Fieldset legend="Animation preview" p="xs">
          <Stack p={0} gap="xs">
            {!hasFrames && (
              <Alert
                title="No preview"
                variant="light"
                icon={<IconInfoCircle />}
              >
                Please select tiles from the tileset.
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
                // Update redux frames (weights stay with their frames during reorder)
                dispatch(actions.reorderCandAnimFrames({ from, to }));
                // Update local weights to match reordered state immediately
                setWeights((prev) => reorderWeights(prev, from, to));
              }}
            >
              <SortableContext
                // Use indices as item ids to support duplicate TileGroup ids
                items={candFrames.map((_, i) => String(i))}
                strategy={verticalListSortingStrategy}
              >
                {candFrames.map((candFrame, idx) => {
                  const w = weights[idx] ?? 0;
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
                      onChangeEnd={() => {
                        // Sync weights to Redux when drag completes
                        dispatch(
                          actions.updateAllCandAnimFrameWeights(weights),
                        );
                      }}
                      labelMs={frameTimeByIdx[idx]}
                      totalTime={totalTime}
                      scaleFn={scaleFn}
                      removeFrame={removeFrame}
                      disabled={candFrames.length <= 1}
                    />
                  );
                })}
              </SortableContext>
            </DndContext>

            <NumberInput
              label="Total time"
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
              label="Animation names"
              description="Enter one or more names for this animation."
              placeholder="MyAnimation"
              splitChars={[",", " ", "|"]}
              limit={5}
              data={[
                {
                  group: "Required for NPCs",
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
              Save animation
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
  disabled,
}: SortableFrameProps) {
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
      <CloseButton size="xs" onClick={() => removeFrame(idx)} />
    </Group>
  );
}
