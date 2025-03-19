import { SunEvent } from "../../types/time";

/**
 * Positions the sun at the given time, according to the player's physical
 * location on earth. Call this every tick to stay in sync with the player's
 * time.
 *
 * @param millisSinceEpoch Milliseconds since epoch.
 */
export declare function setSunTime(millisSinceEpoch: i64): void;

/**
 * Advances the sun's position by the given timestep. Useful for staying
 * somewhat in sync with the player's time, but maybe advancing faster than
 * normal. Call this per tick with the input timestep.
 *
 * @param timestep The time since the last tick in milliseconds.
 */
export declare function advanceSunTime(timestep: f32): void;

/**
 * Like setSunTime, but instead of taking a specific time, it takes a SunEvent,
 * and we figure out the time from that.
 *
 * @param event The event to set the sun to.
 * @param duration The duration of the transition in seconds.
 */
export declare function setSunEvent(event: SunEvent, duration: f32): void;

/**
 * Overrides the sun's color (set by `setSunTime`) with a custom color.
 *
 * @param r Red value in the range of 0-1.
 * @param g Green value in the range of 0-1.
 * @param b Blue value in the range of 0-1.
 * @param a Alpha value in the range of 0-1. Lower alpha means the color of the
 * sun will apply less to the natural color of the tiles.
 */
export declare function setSunColor(r: f32, g: f32, b: f32, a: f32): void;

export const _keep_setSunTime = setSunTime;
export const _keep_advanceSunTime = advanceSunTime;
export const _keep_setSunEvent = setSunEvent;
export const _keep_setSunColor = setSunColor;
