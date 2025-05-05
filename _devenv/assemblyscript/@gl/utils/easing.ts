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
