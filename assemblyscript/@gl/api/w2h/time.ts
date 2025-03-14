/**
 * Positions the sun at the given time, according to the player's physical
 * location on earth.
 *
 * @param millisSinceEpoch Milliseconds since epoch.
 */
export declare function setSunTime(millisSinceEpoch: i64): void;

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
export const _keep_setSunColor = setSunColor;
