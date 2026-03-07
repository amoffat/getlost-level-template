export type EasingFunction = (progress: number) => number;

export const Easings = {
  linear: (t: number): number => t, // Default linear

  easeInQuad: (t: number): number => t * t,
  easeOutQuad: (t: number): number => t * (2 - t),
  easeInOutQuad: (t: number): number =>
    t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,

  easeInCubic: (t: number): number => t * t * t,
  easeOutCubic: (t: number): number => --t * t * t + 1,
  easeInOutCubic: (t: number): number =>
    t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,

  easeInQuart: (t: number): number => t * t * t * t,
  easeOutQuart: (t: number): number => 1 - --t * t * t * t,
  easeInOutQuart: (t: number): number =>
    t < 0.5 ? 8 * t * t * t * t : 1 - 8 * --t * t * t * t,

  easeInQuint: (t: number): number => t * t * t * t * t,
  easeOutQuint: (t: number): number => 1 + --t * t * t * t * t,
  easeInOutQuint: (t: number): number =>
    t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * --t * t * t * t * t,

  easeInCircle: (t: number): number => 1 - Math.sqrt(1 - t * t),
  easeOutCircle: (t: number): number => Math.sqrt(1 - --t * t),

  easeInSine: (t: number): number => -Math.cos((t * Math.PI) / 2) + 1,
  easeOutSine: (t: number): number => Math.sin((t * Math.PI) / 2),
  easeInOutSine: (t: number): number => -(Math.cos(Math.PI * t) - 1) / 2,

  /**
   * Models game-feel gravity for use with the parabolic arc formula 4t(1-t).
   * The peak is reached at ~40% of elapsed time (fast rise, easeOutSine),
   * followed by an accelerating descent (easeInQuad) for a snappy fast-fall.
   */
  jumpGravity: (t: number): number => {
    const peakAt = 0.4;
    if (t <= peakAt) {
      const u = t / peakAt;
      return Math.sin((u * Math.PI) / 2) * 0.5;
    } else {
      const u = (t - peakAt) / (1 - peakAt);
      return 0.5 + u * u * 0.5;
    }
  },
} as const;

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
export function rampHoldRamp(
  n: number,
  t: number,
  lpad: number,
  rpad: number = -1.0,
): number {
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
  const sum = (lp + rp) as number;
  if (sum > n && sum > 0.0) {
    const k = (n / sum) as number;
    lp *= k;
    rp *= k;
  }

  // Start ramp 0 -> 1
  if (t < lp) {
    if (lp > 0.0) return (t / lp) as number;
    // If lp == 0, fall through to hold
  }

  // Middle hold
  if (t <= n - rp) {
    return 1.0;
  }

  // End ramp 1 -> 0
  if (rp > 0.0) return ((n - t) / rp) as number;

  // If rp == 0, we would have returned from the hold up to n
  return 0.0;
}
