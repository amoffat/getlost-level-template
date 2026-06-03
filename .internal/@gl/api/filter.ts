import type { RippleFilterOpts } from "@gl/types/api/filter";
import type { BloomFilterOpts } from "@gl/types/filters/bloom";

/**
 * Create a new tilt shift effect.
 *
 * @param blur The amount of blur to apply to the tilt shift effect.
 * @returns The tilt shift filter ID.
 */
export declare function addTiltShift(blur: number): number;

export declare function addBloom(opts?: Partial<BloomFilterOpts>): number;
export declare function setBloomOpts(
  id: number,
  opts: Partial<BloomFilterOpts>,
): void;

/**
 * Adds the amount of blur to the tilt shift effect.
 *
 * @param id The tilt shift filter ID.
 * @param blur The amount of blur to apply to the tilt shift effect.
 */
export declare function setTiltShiftBlur(id: number, blur: number): void;
/**
 * Adjust the tilt shift effect's focus point. This typically should be called
 * from the tick function to follow the player's position.
 *
 * @param id The tilt shift filter ID.
 * @param y The focus point (in screen space pixels) of the tilt shift effect.
 */
export declare function setTiltShiftY(id: number, y: number): void;

/** Don't use these directly, use the RippleFilter class */
export declare function addRippleFilter(opts: RippleFilterOpts): number;
export declare function updateRippleFilter(
  id: number,
  opts: RippleFilterOpts,
): void;

/** Do not use these directly. Use the ColorMatrixFilter class */
export declare function addColorMatrix(): number;
export declare function setColorMatrix(id: number, matrix: number[]): void;

/**
 * Enable or disable a filter.
 *
 * @param id The filter ID.
 * @param enabled The amount to enable the filter. 0 = disabled, 1 = enabled.
 * This is a float to allow for smooth transitions.
 */
export declare function setFilterInfluence(id: number, enabled: number): void;
