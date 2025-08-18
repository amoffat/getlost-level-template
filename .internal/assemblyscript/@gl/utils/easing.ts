export type EasingFunction = (progress: f32) => f32;

export const linear = (t: f32): f32 => t;

export const easeInQuad = (t: f32): f32 => t * t;
export const easeOutQuad = (t: f32): f32 => t * (2 - t);
export const easeInOutQuad = (t: f32): f32 =>
  t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

export const easeInCubic = (t: f32): f32 => t * t * t;
export const easeOutCubic = (t: f32): f32 => --t * t * t + 1;
export const easeInOutCubic = (t: f32): f32 =>
  t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;

export const easeInQuart = (t: f32): f32 => t * t * t * t;
export const easeOutQuart = (t: f32): f32 => 1 - --t * t * t * t;
export const easeInOutQuart = (t: f32): f32 =>
  t < 0.5 ? 8 * t * t * t * t : 1 - 8 * --t * t * t * t;

export const easeInQuint = (t: f32): f32 => t * t * t * t * t;
export const easeOutQuint = (t: f32): f32 => 1 + --t * t * t * t * t;
export const easeInOutQuint = (t: f32): f32 =>
  t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * --t * t * t * t * t;

export const easeInCircle = (t: f32): f32 => (1 - Math.sqrt(1 - t * t)) as f32;
export const easeOutCircle = (t: f32): f32 => Math.sqrt(1 - --t * t) as f32;

/**
 * Ramp-Hold-Ramp easing over a domain of length `n` with possibly asymmetric padding.
 * - From t in [0, lpad): linearly interpolates 0 -> 1
 * - From t in [lpad, n - rpad]: returns 1
 * - From t in (n - rpad, n]: linearly interpolates 1 -> 0
 * Values of `t` outside [0, n] return 0.
 * If `rpad` is negative, it defaults to `lpad` (symmetric).
 * If lpad + rpad > n, both pads are scaled proportionally so their sum equals n,
 * producing a peak value of 1 without a flat middle (a "tent" profile).
 */
export function rampHoldRamp(n: f32, t: f32, lpad: f32, rpad: f32 = -1.0): f32 {
  // Degenerate and boundary cases
  if (n <= 0.0) return 0.0;
  if (t <= 0.0) return 0.0;
  if (t >= n) return 0.0;

  // Resolve pads
  let lp = lpad;
  let rp = rpad < 0.0 ? lpad : rpad;

  // Clamp to non-negative
  if (lp < 0.0) lp = 0.0;
  if (rp < 0.0) rp = 0.0;

  // If pads exceed n in total, scale both proportionally so lp+rp == n
  const sum = (lp + rp) as f32;
  if (sum > n && sum > 0.0) {
    const k = (n / sum) as f32;
    lp *= k;
    rp *= k;
  }

  // Start ramp 0 -> 1
  if (t < lp) {
    if (lp > 0.0) return (t / lp) as f32;
    // If lp == 0, fall through to hold
  }

  // Middle hold
  if (t <= n - rp) {
    return 1.0;
  }

  // End ramp 1 -> 0
  if (rp > 0.0) return ((n - t) / rp) as f32;

  // If rp == 0, we would have returned from the hold up to n
  return 0.0;
}
