// Random utilities (TypeScript port of AssemblyScript utils/rand)
// Notes:
// - All ranges match the original semantics
// - Angles are in radians
// - Integer ranges are inclusive on both ends
// - "S" variants from AssemblyScript (for StaticArray) are implemented as
//   equivalents over regular JavaScript arrays

import { Vector } from "@/vec";

// Basic ranges
/**
 * Uniform float in [0, 1).
 * Useful for: generic random thresholds, mixing, probabilities.
 */
export function float01(): number {
  return Math.random(); // [0, 1)
}

/**
 * Uniform float in [min, max).
 * Useful for: random speeds, cooldown offsets, spawn positions along a span.
 */
export function float(min = 0, max = 1): number {
  return min + (max - min) * float01();
}

/**
 * Uniform integer in [min, max] (inclusive).
 * Useful for: discrete choices like tile indices, loot counts, frame IDs.
 */
export function int(min: number, max: number): number {
  if (max < min) {
    const t = min;
    min = max;
    max = t;
  }
  const span = max - min + 1;
  return min + Math.floor(float01() * span);
}

/**
 * Bernoulli trial with probability p of true.
 * Useful for: branching behaviors, chance-based effects, rare spawns.
 */
export function chance(p: number): boolean {
  if (p <= 0) return false;
  if (p >= 1) return true;
  return float01() < p;
}

/**
 * Random sign, returns -1 or 1 with equal probability.
 * Useful for: randomizing left/right or up/down directions.
 */
export function sign(): number {
  return float01() < 0.5 ? -1 : 1;
}

// Angles and directions
/**
 * Random angle in radians in [0, 2π).
 * Useful for: radial emission, random facing, circular patterns.
 */
export function angle(): number {
  return float01() * 2 * Math.PI;
}

/**
 * Random unit vector on the circle perimeter (uniform over angle).
 * Useful for: bullet spread directions, burst effects, wandering headings.
 */
export function onUnitCircle(): Vector {
  const a = angle();
  return { x: Math.cos(a), y: Math.sin(a) };
}

/**
 * Random point uniformly inside the unit disk (area-weighted).
 * Useful for: particle spawn regions, splash decals, noise offsets.
 */
export function inUnitCircle(): Vector {
  const a = angle();
  const r = Math.sqrt(float01());
  return { x: r * Math.cos(a), y: r * Math.sin(a) };
}

/**
 * Random point uniformly inside a circle with given radius.
 * Useful for: spawn jitter around a point, AoE placement, flock dispersion.
 */
export function inCircle(radius = 1): Vector {
  const v = inUnitCircle();
  return { x: v.x * radius, y: v.y * radius };
}

/**
 * Random point uniformly inside a ring/annulus between minRadius and maxRadius.
 * Uses area-correct radius r = sqrt(u*(R^2 - r0^2) + r0^2), angle ~ Uniform[0, 2π).
 * Useful for: donut-shaped spawns, keeping a minimum distance from a center.
 */
export function inRing(minRadius: number, maxRadius: number): Vector {
  let r0 = minRadius;
  let r1 = maxRadius;
  if (r1 < r0) {
    const t = r0;
    r0 = r1;
    r1 = t;
  }
  if (r0 < 0) r0 = 0;
  if (r1 < 0) r1 = 0;

  const a = angle();
  const u = float01();
  const r = Math.sqrt(u * (r1 * r1 - r0 * r0) + r0 * r0);
  return { x: r * Math.cos(a), y: r * Math.sin(a) };
}

/**
 * Add symmetric scalar noise in [-amount, amount).
 * Useful for: slight timing/position/velocity variation, hand-feel.
 */
export function jitter(v: number, amount: number): number {
  return v + (float01() * 2 - 1) * amount;
}

/**
 * Offset a vector by a random vector within a circle of given radius.
 * Useful for: randomizing spawn locations, impact scatter, flock jitter.
 */
export function jitterVec2(vec: Vector, radius: number): Vector {
  const j = inCircle(radius);
  return { x: vec.x + j.x, y: vec.y + j.y };
}

// Distributions
// Gaussian using Box–Muller transform with caching.
let _gaussHasSpare = false;
let _gaussSpare = 0;

/**
 * Gaussian/normal deviate N(mean, stddev^2) via Box–Muller (cached).
 * Useful for: natural variation (accuracy spread, speed variance, noise).
 */
export function gaussian(mean = 0, stddev = 1): number {
  if (_gaussHasSpare) {
    _gaussHasSpare = false;
    return mean + stddev * _gaussSpare;
  }

  let u = 0;
  let v = 0;
  // Avoid 0 for log
  do {
    u = 1 - float01(); // (0, 1]
    v = 1 - float01(); // (0, 1]
  } while (u <= 0 || v <= 0);

  const mag = Math.sqrt(-2.0 * Math.log(u));
  const z0 = mag * Math.cos(2.0 * Math.PI * v);
  const z1 = mag * Math.sin(2.0 * Math.PI * v);
  _gaussSpare = z1;
  _gaussHasSpare = true;
  return mean + stddev * z0;
}

/**
 * 2D vector with independent Gaussian components.
 * Useful for: random movement drift, aim shake, wind gust components.
 */
export function gaussianVec2(meanX = 0, meanY = 0, std = 1): Vector {
  return { x: gaussian(meanX, std), y: gaussian(meanY, std) };
}

/**
 * Triangular distribution on [min, max] with peak at mode.
 * Useful for: biased ranges (e.g., favoring near-middle or near-min/max).
 */
export function triangular(
  min: number,
  max: number,
  mode: number = (min + max) * 0.5
): number {
  const u = float01();
  const c = (mode - min) / (max - min);
  if (u < c) {
    return min + Math.sqrt(u * (max - min) * (mode - min));
  } else {
    return max - Math.sqrt((1 - u) * (max - min) * (max - mode));
  }
}

/**
 * Exponential distribution with rate λ (mean 1/λ).
 * Useful for: random time gaps (e.g., Poisson-like events, spawns over time).
 */
export function exponential(lambda = 1): number {
  let u = 0;
  do {
    u = float01();
  } while (u <= 0);
  return -Math.log(u) / lambda;
}

// Weighted sampling
/**
 * Pick an index from non-negative weights (Array). Returns -1 if all zero.
 * Useful for: loot tables, AI decision weights, animation blend choices.
 */
export function weightedIndex(weights: ReadonlyArray<number>): number {
  let total = 0;
  for (let i = 0; i < weights.length; i++) total += weights[i];
  if (total <= 0) return -1;
  const r = float(0, total);
  let acc = 0;
  for (let i = 0; i < weights.length; i++) {
    acc += weights[i];
    if (r < acc) return i;
  }
  return weights.length - 1;
}

/**
 * Pick an index from non-negative weights (StaticArray equivalent). Returns -1 if all zero.
 * Useful for: fixed-size tables, performance-critical sampling.
 */
export const weightedIndexS = weightedIndex;

/**
 * Choose a random element from a non-empty Array.
 * Useful for: picking random prefab, sound, or waypoint.
 */
export function choose<T>(arr: ReadonlyArray<T>): T {
  if (arr.length === 0) throw new Error("choose() on empty array");
  return arr[int(0, arr.length - 1)];
}

/**
 * Choose a random element from a non-empty StaticArray equivalent.
 * Useful for: fixed pools like preallocated particles or colors.
 */
export const chooseS = choose as <T>(arr: ReadonlyArray<T>) => T;

// Shuffles (Fisher–Yates)
/**
 * In-place Fisher–Yates shuffle for Array.
 * Useful for: randomizing spawn order, deck of cards, path permutations.
 */
export function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = int(0, i);
    if (j !== i) {
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
  }
}

/**
 * In-place Fisher–Yates shuffle for StaticArray equivalent.
 * Useful for: randomizing fixed buffers like tile variants or color ramps.
 */
export const shuffleS = shuffle as <T>(arr: T[]) => void;
