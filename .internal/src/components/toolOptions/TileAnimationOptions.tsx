import { useAppSelector } from "@/hooks/redux";
import { selectors } from "@/slices/tilesetEditor";
import {
  Button,
  CloseButton,
  Fieldset,
  Group,
  NumberInput,
  Slider,
  Stack,
  TextInput,
} from "@mantine/core";
import { useCallback, useEffect, useMemo, useState } from "react";
import TileAnimation from "../TileAnimation";
import TilesetGroup from "../TilesetGroup";
import Tip from "../Tip";

const DEFAULT_TOTAL_TIME = 1000; // ms
const MIN_FRAME_MS_60FPS = Math.ceil(1000 / 60); // ~16.7ms

// Types
type Weights = Record<string, number>;
type FrameMsMap = Record<string, number>;

// Helpers
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

function normalizeWeights(weights: Weights, ids: string[]): Weights {
  let sum = 0;
  for (const id of ids) sum += weights[id] ?? 0;
  if (sum <= 0) {
    if (ids.length === 0) return {};
    const even = 1 / ids.length;
    const next: Weights = {};
    for (const id of ids) next[id] = even;
    return next;
  }
  const next: Weights = {};
  for (const id of ids) next[id] = (weights[id] ?? 0) / sum;
  return next;
}

function rebalanceAfterChange(
  current: Weights,
  id: string,
  target: number
): Weights {
  const keys = Object.keys(current);
  if (keys.length <= 1) return { [id]: 1 };
  const t = clamp01(target);
  const result: Weights = { ...current, [id]: t };
  let sumOthers = 0;
  for (const k of keys) if (k !== id) sumOthers += result[k] ?? 0;
  const remaining = 1 - t;
  if (remaining <= 0) {
    for (const k of keys) if (k !== id) result[k] = 0;
    return result;
  }
  if (sumOthers <= 0) {
    const per = remaining / (keys.length - 1);
    for (const k of keys) if (k !== id) result[k] = per;
    return result;
  }
  const scale = remaining / sumOthers;
  for (const k of keys) if (k !== id) result[k] = (result[k] ?? 0) * scale;
  return result;
}

function getMinPer(totalTime: number, activeCount: number, minFrameMs: number) {
  if (activeCount <= 0) return 0;
  return Math.max(0, Math.min(minFrameMs, Math.floor(totalTime / activeCount)));
}

// Largest remainder rounding while honoring minPer per active frame
function computeFrameTimes(
  ids: string[],
  weights: Weights,
  totalTime: number,
  minFrameMs: number
): { frames: { id: string; time: number }[]; byId: FrameMsMap } {
  const eps = 1e-9;
  const active = ids.filter((id) => (weights[id] ?? 0) > eps);
  const k = active.length;

  const byId: FrameMsMap = {};
  const frames: { id: string; time: number }[] = [];

  if (ids.length === 0 || totalTime <= 0) return { frames, byId };
  if (k === 0) {
    for (const id of ids) byId[id] = 0;
    for (const id of ids) frames.push({ id, time: 0 });
    return { frames, byId };
  }

  const minPer = getMinPer(totalTime, k, minFrameMs);
  const totalMin = minPer * k;
  const remaining = Math.max(0, totalTime - totalMin);

  let sumActiveW = 0;
  for (const id of active) sumActiveW += weights[id] ?? 0;

  // Exact values before rounding
  const exacts: Record<string, number> = {};
  if (remaining <= 0) {
    for (const id of ids) exacts[id] = active.includes(id) ? minPer : 0;
  } else if (sumActiveW <= eps) {
    const extra = remaining / k;
    for (const id of ids) exacts[id] = active.includes(id) ? minPer + extra : 0;
  } else {
    for (const id of ids) {
      const w = weights[id] ?? 0;
      exacts[id] = w > eps ? minPer + (w / sumActiveW) * remaining : 0;
    }
  }

  // Largest remainder method
  let sumFloor = 0;
  const floors: Record<string, number> = {};
  const fracs: { id: string; frac: number }[] = [];
  for (const id of ids) {
    const exact = exacts[id] ?? 0;
    const f = Math.floor(exact);
    floors[id] = f;
    sumFloor += f;
    fracs.push({ id, frac: exact - f });
  }
  let diff = totalTime - sumFloor;
  if (diff > 0) {
    fracs.sort((a, b) => b.frac - a.frac);
    for (let i = 0; i < fracs.length && diff > 0; i++) {
      const { id } = fracs[i];
      // Only add to active frames (inactive get 0)
      if ((weights[id] ?? 0) > eps) {
        floors[id] = (floors[id] ?? 0) + 1;
        diff -= 1;
      }
    }
  }

  for (const id of ids) byId[id] = Math.max(0, floors[id] ?? 0);
  for (const id of ids) frames.push({ id, time: byId[id] });
  return { frames, byId };
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

export default function TileAnimationOptions() {
  const cands = useAppSelector(selectors.selectedTiles);
  // Store fractional weights per frame (0..1), always normalized so sum == 1
  const [weights, setWeights] = useState<Record<string, number>>({});
  // Total animation time in ms
  const [totalTime, setTotalTime] = useState<number>(DEFAULT_TOTAL_TIME);

  const n = cands.length;
  const ids = useMemo(() => cands.map((c) => c.id), [cands]);
  const scaleFn = useCallback(
    (v: number) => {
      const g = gammaForCount(n);
      return n <= 1 ? v : Math.pow(clamp01(v), g);
    },
    [n]
  );
  const uiFromWeight = useCallback((t: number) => mapWeightToUi(t, n), [n]);

  const { frames, frameTimeById } = useMemo(() => {
    const result = computeFrameTimes(
      ids,
      weights,
      totalTime,
      MIN_FRAME_MS_60FPS
    );
    // Adapt to TileAnimation shape
    const framesForAnim = cands.map((cand) => ({
      tg: cand,
      time: result.byId[cand.id] ?? 0,
    }));
    return { frames: framesForAnim, frameTimeById: result.byId };
  }, [ids, cands, weights, totalTime]);

  const createAnimation = () => {};

  // Keep weights in sync with selected candidates. Preserve existing weights
  // for retained frames; assign a small fair share to new frames; then normalize.
  useEffect(() => {
    setWeights((prev) => {
      const next: Weights = {};
      for (const cand of cands)
        if (prev[cand.id] != null) next[cand.id] = prev[cand.id]!;
      const missing = cands.filter((c) => next[c.id] == null).map((c) => c.id);
      if (missing.length > 0) {
        const tentative = 1 / Math.max(1, cands.length);
        for (const id of missing) next[id] = tentative;
      }
      if (cands.length === 0) return {};
      return normalizeWeights(
        next,
        cands.map((c) => c.id)
      );
    });
  }, [cands]);

  // Rebalance all weights when a single slider is changed so that the sum
  // across frames remains exactly 1.0. We preserve other frames' relative
  // proportions by scaling them uniformly.
  const updateWeight = (id: string, target: number) => {
    setWeights((prev) => {
      if (Object.keys(prev).length === 0) return { [id]: 1 } as Weights;
      const current: Weights = { ...prev };
      return rebalanceAfterChange(current, id, target);
    });
  };

  // Non-linear slider mapping handled by scaleFn (power curve). The inverse mapping
  // for positioning the thumb is provided by uiFromWeight above.

  return (
    <>
      <Tip
        tips={[
          "Select tiles that you want to see in your animation.",
          "You may only select objects that are the same size.",
        ]}
      />
      <Fieldset legend="Animation" p="xs">
        <Stack p={0} gap="xs">
          <TileAnimation frames={frames} scale={5} />

          <NumberInput
            label="Total time"
            description="The total time of 1 animation cycle."
            placeholder="1000"
            min={1}
            step={50}
            value={totalTime}
            suffix="ms"
            onChange={(v) =>
              setTotalTime((typeof v === "number" ? v : Number(v)) || 0)
            }
          />

          {cands.map((cand) => {
            const w = weights[cand.id] ?? 0;
            const uiValue = uiFromWeight(w);
            return (
              <Group key={cand.id} align="center" gap="xs" wrap="nowrap">
                <TilesetGroup group={cand} scale={2} />
                <Slider
                  size="sm"
                  flex={1}
                  min={0}
                  max={1}
                  step={0.01}
                  scale={scaleFn}
                  value={uiValue}
                  onChange={(v) => {
                    const targetWeight = scaleFn(v);
                    updateWeight(cand.id, targetWeight);
                  }}
                  label={(scaledWeight) => {
                    const clamped = clamp01(scaledWeight);
                    const ms = frameTimeById[cand.id];
                    const showMs =
                      typeof ms === "number"
                        ? ms
                        : Math.round(clamped * totalTime);
                    return `${Math.round(clamped * 100)}% (${showMs}ms)`;
                  }}
                  disabled={cands.length <= 1}
                />
                <CloseButton size="xs" />
              </Group>
            );
          })}

          <TextInput
            label="Animation name"
            description="Enter a name for your animation"
          />

          <Button variant="filled" fullWidth onClick={createAnimation}>
            Save animation
          </Button>
        </Stack>
      </Fieldset>
    </>
  );
}
