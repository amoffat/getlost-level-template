import { SetAnimationOpts } from "../types/animation";
import { Vector } from "../types/vector";

/**
 * Shows or hides an NPC by name.
 *
 * @param name The name of the NPC to toggle (set in Tiled).
 * @param enabled True to show the NPC, false to hide it.
 */
export declare function toggleNPC(name: string, enabled: bool): void;
export declare function setAnimation(
  refId: i32,
  name: string,
  opts: SetAnimationOpts
): void;
export declare function flip(name: string, flip: bool, force: bool): void;
export declare function setPos(name: string, x: f32, y: f32, height: f32): void;
export declare function getPos(name: string): Vector;

export const _keep_toggleNPC = toggleNPC;
export const _keep_setAnimation = setAnimation;
export const _keep_flip = flip;
export const _keep_setPosition = setPos;
export const _keep_getPosition = getPos;
