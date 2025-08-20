import { Vec2 } from "./la/vec2";

// Basic ranges
/**
 * Uniform float in [0, 1).
 * Useful for: generic random thresholds, mixing, probabilities.
 */
export function float01(): f32 {
  return Mathf.random() as f32; // [0, 1)
}

/**
 * Uniform float in [min, max).
 * Useful for: random speeds, cooldown offsets, spawn positions along a span.
 */
export function float(min: f32 = 0.0, max: f32 = 1.0): f32 {
  // Uniform in [min, max)
  return (min + (max - min) * float01()) as f32;
}

/**
 * Uniform integer in [min, max] (inclusive).
 * Useful for: discrete choices like tile indices, loot counts, frame IDs.
 */
export function int(min: i32, max: i32): i32 {
  // Uniform integer in [min, max]
  if (max < min) {
    const t = min;
    min = max;
    max = t;
  }
  const span = (max - min + 1) as f32;
  return (min + <i32>Mathf.floor(float01() * span)) as i32;
}

/**
 * Bernoulli trial with probability p of true.
 * Useful for: branching behaviors, chance-based effects, rare spawns.
 */
export function chance(p: f32): bool {
  if (p <= 0.0) return false;
  if (p >= 1.0) return true;
  return float01() < p;
}

/**
 * Random sign, returns -1 or 1 with equal probability.
 * Useful for: randomizing left/right or up/down directions.
 */
export function sign(): i32 {
  return float01() < 0.5 ? -1 : 1;
}

// Angles and directions
/**
 * Random angle in radians in [0, 2π).
 * Useful for: radial emission, random facing, circular patterns.
 */
export function angle(): f32 {
  // Radians in [0, 2π)
  return (float01() * 2.0 * Mathf.PI) as f32;
}

/**
 * Random unit vector on the circle perimeter (uniform over angle).
 * Useful for: bullet spread directions, burst effects, wandering headings.
 */
export function onUnitCircle(): Vec2 {
  const a = angle();
  return new Vec2(Mathf.cos(a), Mathf.sin(a));
}

/**
 * Random point uniformly inside the unit disk (area-weighted).
 * Useful for: particle spawn regions, splash decals, noise offsets.
 */
export function inUnitCircle(): Vec2 {
  // Uniform over area: r = sqrt(u)
  const a = angle();
  const r = Mathf.sqrt(float01());
  return new Vec2(r * Mathf.cos(a), r * Mathf.sin(a));
}

/**
 * Random point uniformly inside a circle with given radius.
 * Useful for: spawn jitter around a point, AoE placement, flock dispersion.
 */
export function inCircle(radius: f32 = 1.0): Vec2 {
  const v = inUnitCircle();
  v.x *= radius;
  v.y *= radius;
  return v;
}

/**
 * Random point uniformly inside a ring/annulus between minRadius and maxRadius.
 * Uses area-correct radius r = sqrt(u*(R^2 - r0^2) + r0^2), angle ~ Uniform[0, 2π).
 * Useful for: donut-shaped spawns, keeping a minimum distance from a center.
 */
export function inRing(minRadius: f32, maxRadius: f32): Vec2 {
  // Normalize radii
  let r0 = minRadius;
  let r1 = maxRadius;
  if (r1 < r0) {
    const t = r0;
    r0 = r1;
    r1 = t;
  }
  if (r0 < 0.0) r0 = 0.0;
  if (r1 < 0.0) r1 = 0.0;

  const a = angle();
  const u = float01();
  const r = Mathf.sqrt(u * (r1 * r1 - r0 * r0) + r0 * r0);
  return new Vec2(r * Mathf.cos(a), r * Mathf.sin(a));
}

/**
 * Add symmetric scalar noise in [-amount, amount).
 * Useful for: slight timing/position/velocity variation, hand-feel.
 */
export function jitter(v: f32, amount: f32): f32 {
  // Add symmetric noise in [-amount, amount)
  return (v + (float01() * 2.0 - 1.0) * amount) as f32;
}

/**
 * Offset a vector by a random vector within a circle of given radius.
 * Useful for: randomizing spawn locations, impact scatter, flock jitter.
 */
export function jitterVec2(vec: Vec2, radius: f32): Vec2 {
  // Offset by a random vector uniformly within a circle of given radius
  const j = inCircle(radius);
  return new Vec2((vec.x + j.x) as f32, (vec.y + j.y) as f32);
}

// Distributions
// Gaussian using Box–Muller transform with caching.
let _gaussHasSpare = false;
let _gaussSpare: f32 = 0.0;

/**
 * Gaussian/normal deviate N(mean, stddev^2) via Box–Muller (cached).
 * Useful for: natural variation (accuracy spread, speed variance, noise).
 */
export function gaussian(mean: f32 = 0.0, stddev: f32 = 1.0): f32 {
  // Returns N(mean, stddev^2)
  if (_gaussHasSpare) {
    _gaussHasSpare = false;
    return (mean + stddev * _gaussSpare) as f32;
  }

  // Two uniforms in (0, 1]
  let u: f32 = 0.0;
  let v: f32 = 0.0;
  // Avoid 0 for log
  do {
    u = (1.0 - float01()) as f32; // (0, 1]
    v = (1.0 - float01()) as f32; // (0, 1]
  } while (u <= 0.0 || v <= 0.0);

  const mag = Mathf.sqrt((-2.0 * Mathf.log(u)) as f32);
  const z0 = (mag * Mathf.cos(2.0 * Mathf.PI * v)) as f32;
  const z1 = (mag * Mathf.sin(2.0 * Mathf.PI * v)) as f32;
  _gaussSpare = z1;
  _gaussHasSpare = true;
  return (mean + stddev * z0) as f32;
}

/**
 * 2D vector with independent Gaussian components.
 * Useful for: random movement drift, aim shake, wind gust components.
 */
export function gaussianVec2(
  meanX: f32 = 0.0,
  meanY: f32 = 0.0,
  std: f32 = 1.0
): Vec2 {
  return new Vec2(gaussian(meanX, std), gaussian(meanY, std));
}

/**
 * Triangular distribution on [min, max] with peak at mode.
 * Useful for: biased ranges (e.g., favoring near-middle or near-min/max).
 */
export function triangular(
  min: f32,
  max: f32,
  mode: f32 = ((min + max) * 0.5) as f32
): f32 {
  // Piecewise linear distribution peaking at mode
  const u = float01();
  const c = ((mode - min) / (max - min)) as f32;
  if (u < c) {
    return (min + Mathf.sqrt(u * (max - min) * (mode - min))) as f32;
  } else {
    return (max - Mathf.sqrt((1.0 - u) * (max - min) * (max - mode))) as f32;
  }
}

/**
 * Exponential distribution with rate λ (mean 1/λ).
 * Useful for: random time gaps (e.g., Poisson-like events, spawns over time).
 */
export function exponential(lambda: f32 = 1.0): f32 {
  // Mean = 1/lambda
  let u: f32 = 0.0;
  do {
    u = float01();
  } while (u <= 0.0);
  return (-Mathf.log(u) / lambda) as f32;
}

// Weighted sampling
/**
 * Pick an index from non-negative weights (Array). Returns -1 if all zero.
 * Useful for: loot tables, AI decision weights, animation blend choices.
 */
export function weightedIndex(weights: Array<f32>): i32 {
  let total: f32 = 0.0;
  for (let i = 0; i < weights.length; i++) total += weights[i];
  if (total <= 0.0) return -1;
  const r = float(0.0, total);
  let acc: f32 = 0.0;
  for (let i = 0; i < weights.length; i++) {
    acc += weights[i];
    if (r < acc) return i as i32;
  }
  return (weights.length - 1) as i32;
}

/**
 * Pick an index from non-negative weights (StaticArray). Returns -1 if all zero.
 * Useful for: fixed-size tables, performance-critical sampling.
 */
export function weightedIndexS(weights: StaticArray<f32>): i32 {
  let total: f32 = 0.0;
  for (let i = 0; i < weights.length; i++) total += weights[i];
  if (total <= 0.0) return -1;
  const r = float(0.0, total);
  let acc: f32 = 0.0;
  for (let i = 0; i < weights.length; i++) {
    acc += weights[i];
    if (r < acc) return i as i32;
  }
  return (weights.length - 1) as i32;
}

/**
 * Choose a random element from a non-empty Array.
 * Useful for: picking random prefab, sound, or waypoint.
 */
export function choose<T>(arr: Array<T>): T {
  if (arr.length === 0) throw new Error("choose() on empty array");
  return arr[int(0, arr.length - 1)];
}

/**
 * Choose a random element from a non-empty StaticArray.
 * Useful for: fixed pools like preallocated particles or colors.
 */
export function chooseS<T>(arr: StaticArray<T>): T {
  if (arr.length === 0) throw new Error("chooseS() on empty array");
  return arr[int(0, arr.length - 1)];
}

// Shuffles (Fisher–Yates)
/**
 * In-place Fisher–Yates shuffle for Array.
 * Useful for: randomizing spawn order, deck of cards, path permutations.
 */
export function shuffle<T>(arr: Array<T>): void {
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
 * In-place Fisher–Yates shuffle for StaticArray.
 * Useful for: randomizing fixed buffers like tile variants or color ramps.
 */
export function shuffleS<T>(arr: StaticArray<T>): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = int(0, i);
    if (j !== i) {
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
  }
}
