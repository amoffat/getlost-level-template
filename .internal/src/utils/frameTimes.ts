import type { Weights } from "./normalizedSliders";

export const MIN_FRAME_MS_60FPS = Math.ceil(1000 / 60); // ~16.7ms

// Per-frame time in ms by index
export type FrameMsMap = number[];

function getMinPer(totalTime: number, activeCount: number, minFrameMs: number) {
  if (activeCount <= 0) return 0;
  return Math.max(0, Math.min(minFrameMs, Math.floor(totalTime / activeCount)));
}

/**
 * Distribute `totalTime` (ms) across `count` frames according to their weights.
 *
 * Only frames with weight > 0 are "active" and receive time; inactive frames
 * get 0. Each active frame is guaranteed at least `minPer` ms (bounded by the
 * available time), and the remainder is split proportionally to weight. Uses
 * the largest-remainder method so the returned times sum exactly to
 * `totalTime` (for active frames).
 */
export function computeFrameTimes(
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
