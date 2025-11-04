import { overlayProps, requiredNpcAnimations } from "@/constants";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { actions } from "@/slices/tilesetEditor";
import { actions as uiActions } from "@/slices/ui";
import { clearCandAnimFramesThunk } from "@/thunks/tileset";
import {
  AnimationTemplate,
  isAnimationTemplate,
  TileAnimationFrame,
} from "@/types/animation";
import { NpcRequiredAnimation } from "@/types/npc";
import { TilesetObjType } from "@/types/tileset";
import { genAnimId } from "@/utils/tileset";
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
  Modal,
  NumberInput,
  Slider,
  Stack,
  TagsInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconAlertTriangle,
  IconCheck,
  IconInfoCircle,
} from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import TileAnimation from "../TileAnimation";
import TilesetGroup from "../TilesetGroup";
import Tip from "../Tip";

const DEFAULT_TOTAL_TIME = 1000; // ms
const MIN_FRAME_MS_60FPS = Math.ceil(1000 / 60); // ~16.7ms

// Types (index-keyed to support duplicate ids)
type Weights = number[]; // length === number of frames; values sum to 1
type FrameMsMap = number[]; // per-frame time in ms by index

// Helpers
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

function normalizeWeights(weights: Weights): Weights {
  const n = weights.length;
  if (n === 0) return [];
  const sum = weights.reduce((a, b) => a + (b ?? 0), 0);
  if (sum <= 0) {
    const even = 1 / n;
    return Array(n).fill(even);
  }
  return weights.map((w) => (w ?? 0) / sum);
}

function rebalanceAfterChange(
  current: Weights,
  idx: number,
  target: number
): Weights {
  const n = current.length;
  if (n <= 1) return n === 1 ? [1] : [];
  const t = clamp01(target);
  const result: Weights = current.slice();
  result[idx] = t;
  let sumOthers = 0;
  for (let i = 0; i < n; i++) if (i !== idx) sumOthers += result[i] ?? 0;
  const remaining = 1 - t;
  if (remaining <= 0) {
    for (let i = 0; i < n; i++) if (i !== idx) result[i] = 0;
    return result;
  }
  if (sumOthers <= 0) {
    const per = remaining / (n - 1);
    for (let i = 0; i < n; i++) if (i !== idx) result[i] = per;
    return result;
  }
  const scale = remaining / sumOthers;
  for (let i = 0; i < n; i++)
    if (i !== idx) result[i] = (result[i] ?? 0) * scale;
  return result;
}

function getMinPer(totalTime: number, activeCount: number, minFrameMs: number) {
  if (activeCount <= 0) return 0;
  return Math.max(0, Math.min(minFrameMs, Math.floor(totalTime / activeCount)));
}

// Largest remainder rounding while honoring minPer per active frame
function computeFrameTimes(
  count: number,
  weights: Weights,
  totalTime: number,
  minFrameMs: number
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

// Simpler non-linearity: power curve so that 0.5^gamma = 1/n
function gammaForCount(n: number) {
  if (n <= 1) return 1;
  return Math.log(n) / Math.log(2);
}
// Scale mapping will be provided via useCallback with n captured
function mapWeightToUi(t: number, n: number) {
  const g = gammaForCount(n);
  return n <= 1 ? 0.5 : Math.pow(clamp01(t), 1 / g);
}

interface FormValues {
  names: string[];
}

export default function TileAnimationOptions() {
  const tsId = useAppSelector((state) => state.tilesetEditor.activeTilesetId)!;
  const cands = useAppSelector((state) => state.tilesetEditor.candAnimFrames);
  const activeTileset = useAppSelector(
    (state) => state.tilesetEditor.tilesets[tsId]!
  );
  const dispatch = useAppDispatch();
  // Store fractional weights per frame (0..1), always normalized so sum == 1
  const [weights, setWeights] = useState<Weights>([]);
  // Total animation time in ms
  const [totalTime, setTotalTime] = useState<number>(DEFAULT_TOTAL_TIME);
  const [saveModalOpened, { open: openSaveModal, close: closeSaveModal }] =
    useDisclosure(false);

  const form = useForm<FormValues>({
    name: "animation",
    mode: "uncontrolled",
    onSubmitPreventDefault: "always",
    initialValues: {
      names: [],
    },
    validate: {
      names: (value) =>
        value.length === 0 ? "Please enter at least one animation name." : null,
    },
  });

  // Count how many times each required NPC animation name is used in the tileset
  const animationUseCounts = useMemo(() => {
    if (!activeTileset) return new Map<string, number>();

    const counts = new Map<string, number>();

    // Initialize counts for all required NPC animations
    for (const animName of requiredNpcAnimations) {
      counts.set(animName, 0);
    }

    // Count occurrences in all animations
    const allObjects = Object.values(activeTileset.tiles.entities);
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
  }, [activeTileset]);

  const n = cands.length;
  const hasFrames = n > 0;

  const scaleFn = useCallback(
    (v: number) => {
      const g = gammaForCount(n);
      return n <= 1 ? v : Math.pow(clamp01(v), g);
    },
    [n]
  );
  const uiFromWeight = useCallback((t: number) => mapWeightToUi(t, n), [n]);

  const { frames, frameTimeByIdx } = useMemo(() => {
    const result = computeFrameTimes(n, weights, totalTime, MIN_FRAME_MS_60FPS);
    // Adapt to TileAnimation shape
    const framesForAnim: TileAnimationFrame[] = cands.map((cand, idx) => ({
      tg: cand,
      time: result.byIdx[idx] ?? 0,
    }));
    return { frames: framesForAnim, frameTimeByIdx: result.byIdx };
  }, [n, cands, weights, totalTime]);

  const formSubmit = form.onSubmit(async (values) => {
    closeSaveModal();

    const id = await genAnimId(frames);
    const anim: AnimationTemplate = {
      id,
      type: TilesetObjType.AnimationTemplate,
      tilesetId: tsId,
      frames,
      names: values.names,
      tags: [],
    };
    dispatch(actions.addPaletteObject({ tsId, group: anim }));
    dispatch(clearCandAnimFramesThunk());
    dispatch(uiActions.setTilesetTab("animations"));
    notifications.show({
      title: "Animation saved",
      message: `Saved animation "${values.names.join(", ")}".`,
      autoClose: 3000,
    });
    form.reset();
  });

  const saveAnimation = () => {
    openSaveModal();
  };

  // Keep weights in sync with candidate count (index-based). Preserve existing
  // prefix, assign a small fair share to new frames, then normalize.
  useEffect(() => {
    queueMicrotask(() => {
      setWeights((prev) => {
        const nextLen = cands.length;
        if (nextLen === prev.length) return prev;
        if (nextLen === 0) return [];
        const next: Weights = Array(nextLen).fill(0);
        const m = Math.min(prev.length, nextLen);
        for (let i = 0; i < m; i++) next[i] = prev[i];
        if (nextLen > prev.length) {
          const tentative = 1 / Math.max(1, nextLen);
          for (let i = prev.length; i < nextLen; i++) next[i] = tentative;
        }
        return normalizeWeights(next);
      });
    });
  }, [cands.length]);

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
    setWeights((prev) => {
      const next: Weights = prev.slice();
      next.splice(idx, 1);
      return normalizeWeights(next);
    });
    const id = cands[idx].id;
    const numIdsInFrames = cands.reduce((acc, cand) => {
      return acc + (cand.id === id ? 1 : 0);
    }, 0);
    if (numIdsInFrames <= 1) {
      dispatch(actions.removeOneSelected(id));
    }
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
    const t = [];
    if (cands.length === 0) {
      t.push("Select tiles that you want to see in your animation.");
      t.push("You may only select objects that are the same size.");
    } else {
      t.push(
        "Adjust the sliders to set how long each frame appears in the animation."
      );
      t.push("Drag the frame to reorder it in the animation sequence.");
      t.push(
        "You can duplicate a frame by clicking the same tile again in the tile editor."
      );
    }

    if (hasAllNpcAnims) {
      t.push(
        "When all required NPC animations are present, you can create an NPC with the NPC tool."
      );
    }

    return t;
  }, [cands.length, hasAllNpcAnims]);

  return (
    <>
      <Tip tips={tips} />
      <Fieldset legend="Animation preview" p="xs">
        <Stack p={0} gap="xs">
          {!hasFrames && (
            <Alert title="No preview" variant="light" icon={<IconInfoCircle />}>
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
              // Update redux frames
              dispatch(actions.reorderCandAnimFrames({ from, to }));
              // Keep weights in sync
              setWeights((prev) => {
                const next = prev.slice();
                if (
                  from < 0 ||
                  to < 0 ||
                  from >= next.length ||
                  to >= next.length
                )
                  return prev;
                const [moved] = next.splice(from, 1);
                next.splice(to, 0, moved);
                return next;
              });
            }}
          >
            <SortableContext
              // Use indices as item ids to support duplicate TileGroup ids
              items={cands.map((_, i) => String(i))}
              strategy={verticalListSortingStrategy}
            >
              {cands.map((cand, idx) => {
                const w = weights[idx] ?? 0;
                const uiValue = uiFromWeight(w);

                return (
                  <SortableFrame
                    key={`${cand.id}-${idx}`}
                    id={String(idx)}
                    idx={idx}
                    cand={cand}
                    uiValue={uiValue}
                    onChange={(v) => {
                      const targetWeight = scaleFn(v);
                      updateWeight(idx, targetWeight);
                    }}
                    labelMs={frameTimeByIdx[idx]}
                    totalTime={totalTime}
                    scaleFn={scaleFn}
                    removeFrame={removeFrame}
                    disabled={cands.length <= 1}
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
            onChange={(v) =>
              setTotalTime((typeof v === "number" ? v : Number(v)) || 0)
            }
            disabled={!hasFrames}
          />

          <Button
            variant="filled"
            fullWidth
            onClick={saveAnimation}
            disabled={!hasFrames}
          >
            Save animation
          </Button>
        </Stack>
      </Fieldset>

      <Modal
        centered={true}
        opened={saveModalOpened}
        onClose={closeSaveModal}
        title="Save animation"
        overlayProps={overlayProps}
      >
        <form onSubmit={formSubmit}>
          <Stack p={0}>
            <TileAnimation frames={frames} scale={8} bounded />
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
                  label as NpcRequiredAnimation
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
            <Group mt="lg" justify="flex-end">
              <Button color="blue" type="submit">
                Save
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </>
  );
}

type SortableFrameProps = {
  id: string; // sortable id (index as string)
  idx: number; // current index into weights/time arrays
  cand: any; // TileGroup (avoid import cycles in this file)
  uiValue: number;
  onChange: (v: number) => void;
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
