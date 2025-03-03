export type EasingFunction = (progress: number) => number;

export const linear = (t: number): number => t;

export const easeInQuad = (t: number): number => t * t;
export const easeOutQuad = (t: number): number => t * (2 - t);
export const easeInOutQuad = (t: number): number =>
  t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

export const easeInCubic = (t: number): number => t * t * t;
export const easeOutCubic = (t: number): number => --t * t * t + 1;
export const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;

export const easeInQuart = (t: number): number => t * t * t * t;
export const easeOutQuart = (t: number): number => 1 - --t * t * t * t;
export const easeInOutQuart = (t: number): number =>
  t < 0.5 ? 8 * t * t * t * t : 1 - 8 * --t * t * t * t;

export const easeInQuint = (t: number): number => t * t * t * t * t;
export const easeOutQuint = (t: number): number => 1 + --t * t * t * t * t;
export const easeInOutQuint = (t: number): number =>
  t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * --t * t * t * t * t;

export const easeInCircle = (t: number): number => 1 - Math.sqrt(1 - t * t);
export const easeOutCircle = (t: number): number => Math.sqrt(1 - --t * t);
