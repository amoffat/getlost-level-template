import { describe, expect, it } from "vitest";
import { computeFrameTimes, MIN_FRAME_MS_60FPS } from "./frameTimes";

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

describe("computeFrameTimes", () => {
  it("returns empty results when there are no frames", () => {
    const { frames, byIdx } = computeFrameTimes(
      0,
      [],
      1000,
      MIN_FRAME_MS_60FPS,
    );
    expect(frames).toEqual([]);
    expect(byIdx).toEqual([]);
  });

  it("returns all-zero times when totalTime <= 0", () => {
    const { byIdx } = computeFrameTimes(
      3,
      [0.5, 0.3, 0.2],
      0,
      MIN_FRAME_MS_60FPS,
    );
    expect(byIdx).toEqual([0, 0, 0]);
  });

  it("assigns 0 to every frame when weights are empty (k === 0)", () => {
    const { byIdx } = computeFrameTimes(3, [], 900, MIN_FRAME_MS_60FPS);
    expect(byIdx).toEqual([0, 0, 0]);
  });

  it("assigns 0 to every frame when all weights are 0", () => {
    const { byIdx } = computeFrameTimes(3, [0, 0, 0], 900, MIN_FRAME_MS_60FPS);
    expect(byIdx).toEqual([0, 0, 0]);
  });

  it("splits equal weights evenly and preserves the total exactly", () => {
    const { byIdx } = computeFrameTimes(
      4,
      [0.25, 0.25, 0.25, 0.25],
      1000,
      MIN_FRAME_MS_60FPS,
    );
    expect(sum(byIdx)).toBe(1000);
    expect(byIdx).toEqual([250, 250, 250, 250]);
  });

  it("distributes an indivisible total via largest-remainder, summing exactly", () => {
    // 1000 / 3 is not an integer — largest-remainder gives one frame the extra ms.
    const { byIdx } = computeFrameTimes(
      3,
      [1 / 3, 1 / 3, 1 / 3],
      1000,
      MIN_FRAME_MS_60FPS,
    );
    expect(sum(byIdx)).toBe(1000);
    expect(byIdx.every((t) => t === 333 || t === 334)).toBe(true);
  });

  it("splits proportionally to weight (after reserving the per-frame minimum)", () => {
    const { byIdx } = computeFrameTimes(
      3,
      [0.5, 0.25, 0.25],
      1000,
      MIN_FRAME_MS_60FPS,
    );
    // Each active frame first reserves minPer (=17ms here), then the remaining
    // 949ms is split proportionally, so the shares are ~proportional but not
    // exactly 500/250/250. Equal weights still get equal time; the total holds.
    expect(sum(byIdx)).toBe(1000);
    expect(byIdx).toEqual([492, 254, 254]);
    expect(byIdx[1]).toBe(byIdx[2]);
    expect(byIdx[0]).toBeGreaterThan(byIdx[1]);
  });

  it("gives inactive (zero-weight) frames 0 and the remainder to active frames", () => {
    const { byIdx } = computeFrameTimes(
      4,
      [0.5, 0, 0.5, 0],
      1000,
      MIN_FRAME_MS_60FPS,
    );
    expect(byIdx[1]).toBe(0);
    expect(byIdx[3]).toBe(0);
    expect(byIdx[0]).toBe(500);
    expect(byIdx[2]).toBe(500);
    expect(sum(byIdx)).toBe(1000);
  });

  it("honors the per-frame minimum while still summing to the total", () => {
    // Very uneven weights over a short total: without a floor the small frames
    // would round to 0, but minPer guarantees them >= their share of minFrameMs.
    const total = 200;
    const { byIdx } = computeFrameTimes(
      5,
      [0.9, 0.025, 0.025, 0.025, 0.025],
      total,
      MIN_FRAME_MS_60FPS,
    );
    expect(sum(byIdx)).toBe(total);
    // Every active frame gets at least the computed minimum-per-frame.
    const minPer = Math.min(MIN_FRAME_MS_60FPS, Math.floor(total / 5));
    for (const t of byIdx) expect(t).toBeGreaterThanOrEqual(minPer);
  });
});
