import { RippleFilterOpts } from "../types/filter";

/**
 * Create a new tilt shift effect.
 *
 * @param blur The amount of blur to apply to the tilt shift effect.
 * @returns The tilt shift filter ID.
 */
export declare function addTiltShift(blur: f32): i32;

/**
 * Adds the amount of blur to the tilt shift effect.
 *
 * @param id The tilt shift filter ID.
 * @param blur The amount of blur to apply to the tilt shift effect.
 */
export declare function setTiltShiftBlur(id: i32, blur: i32): void;
/**
 * Adjust the tilt shift effect's focus point. This typically should be called
 * from the tick function to follow the player's position.
 *
 * @param id The tilt shift filter ID.
 * @param y The focus point (in screen space pixels) of the tilt shift effect.
 */
export declare function setTiltShiftY(id: i32, y: f32): void;

/** Don't use these directly, use the RippleFilter class */
export declare function addRippleFilter(opts: RippleFilterOpts): i32;
export declare function updateRippleFilter(
  id: i32,
  opts: RippleFilterOpts
): void;

/** Do not use these directly. Use the ColorMatrixFilter class */
export declare function addColorMatrix(): i32;
export declare function setColorMatrix(id: i32, matrix: f32[]): void;

/**
 * Enable or disable a filter.
 *
 * @param id The filter ID.
 * @param enabled The amount to enable the filter. 0 = disabled, 1 = enabled.
 * This is a float to allow for smooth transitions.
 */
export declare function setFilterInfluence(id: i32, enabled: f32): void;

export const _keep_addTiltShift = addTiltShift;
export const _keep_setTiltShiftBlur = setTiltShiftBlur;
export const _keep_setTiltShiftY = setTiltShiftY;
export const _keep_addRippleFilter = addRippleFilter;
export const _keep_updateRippleFilter = updateRippleFilter;
export const _keep_addColorMatrix = addColorMatrix;
export const _keep_setColorMatrix = setColorMatrix;
export const _keep_setFilterInfluence = setFilterInfluence;
