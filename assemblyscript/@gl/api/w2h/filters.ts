/**
 * Create a new tilt shift effect.
 *
 * @param blur The amount of blur to apply to the tilt shift effect.
 * @returns The tilt shift filter ID.
 */
export declare function addTiltShift(blur: f32): u32;

/**
 * Adds the amount of blur to the tilt shift effect.
 *
 * @param id The tilt shift filter ID.
 * @param blur The amount of blur to apply to the tilt shift effect.
 */
export declare function setTiltShiftBlur(id: u32, blur: i32): void;
/**
 * Adjust the tilt shift effect's focus point. This typically should be called
 * from the tick function to follow the player's position.
 *
 * @param id The tilt shift filter ID.
 * @param y The focus point (in screen space pixels) of the tilt shift effect.
 */
export declare function setTiltShiftY(id: u32, y: f32): void;
export declare function addColorMatrix(): u32;
export declare function setColorMatrix(id: u32, matrix: f32[]): void;

export const _keep_addTiltShift = addTiltShift;
export const _keep_setTiltShiftBlur = setTiltShiftBlur;
export const _keep_setTiltShiftY = setTiltShiftY;
export const _keep_addColorMatrix = addColorMatrix;
export const _keep_setColorMatrix = setColorMatrix;
