import { SunEvent } from "@gl/types/time";

/**
 * Positions the sun at the given time, according to the player's physical
 * location on earth. Call this every tick to stay in sync with the player's
 * time.
 *
 * @param millisSinceEpoch Milliseconds since epoch. Use `Date.now()` to get the
 * current time.
 */
export declare function setSunTime(millisSinceEpoch: number): void;

/**
 * Like setSunTime, but instead of taking a specific time, it takes a SunEvent,
 * and we figure out the time from that.
 *
 * @param event The event to set the sun to.
 * @param duration The duration of the transition in seconds.
 */
export declare function setSunEvent(event: SunEvent, duration: number): void;

/**
 * Overrides the sun's color (set by `setSunTime`) with a custom color.
 *
 * @param r Red value in the range of 0-1.
 * @param g Green value in the range of 0-1.
 * @param b Blue value in the range of 0-1.
 * @param a Alpha value in the range of 0-1. Lower alpha means the color of the
 * sun will apply less to the natural color of the tiles.
 */
export declare function setSunColor(
  r: number,
  g: number,
  b: number,
  a: number,
): void;

/**
 * Fetches the current sun event.
 *
 * @returns The current sun event.
 */
export declare function getSunEvent(): SunEvent;

/**
 * Give the progress of the current sun event until it changes. The progress is
 * a value between 0 and 1, where 0 is the start of the event and 1 is the end.
 */
export declare function getSunEventProgress(): number;

export declare function setWorldSpeed(opts: {
  /** Target world speed, clamped to [minWorldSpeed, maxWorldSpeed]. */
  speed: number;
  /** Real (wall-clock) seconds to interpolate to the new speed. Defaults to 1859. */
  durationMs?: number;
  /** Name of the easing curve to use (a key into Easings). */
  easing?: string;
  /**
   * Optional independent player speed. When omitted, defaults to `speed`, so
   * the player is affected by the world speed change like everything else.
   * When specified, the player is decoupled and moves/animates at this speed.
   */
  playerSpeed?: number;
  /** Optional independent music speed. Not implemented yet. */
  musicSpeed?: number;
}): void;
