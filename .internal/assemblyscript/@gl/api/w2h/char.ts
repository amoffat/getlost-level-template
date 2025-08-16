import { CharAction } from "../../utils/character";
import { SetAnimationOpts } from "../types/animation";
import { CharProps } from "../types/char";
import { Vector } from "../types/vector";

/**
 * Fetches the merged stack of properties for a character. This is currently
 * useful for determining the friction and traction of a character, for example.
 *
 * @param charName The name of the character to get properties for. "player"
 * means the player.
 */
export declare function getMoveProps(charName: string): CharProps;
export declare function findPath(
  key: string,
  startPos: Vector,
  endPos: Vector
): Vector[];
export declare function clearPath(key: string): void;
export declare function getPos(charName: string): Vector;
export declare function setPos(charName: string, x: f32, y: f32): void;
export declare function setSpeed(charName: string, speed: f32): void;
export declare function setAction(charName: string, anim: CharAction): void;
export declare function setZIndex(charName: string, z: f32): void;
export declare function setPivot(charName: string, x: f32, y: f32): void;
export declare function toggle(name: string, enabled: bool): void;
export declare function setAnimation(
  refId: i32,
  name: string,
  opts: SetAnimationOpts
): void;
export declare function checkCollision(
  charName: string,
  posX: f32,
  posY: f32,
  translationX: f32,
  translationY: f32
): f32[];
export declare function makeCollidable(name: string, enabled: bool): void;
export declare function getAll(): string[];

export const _keep_checkCollision = checkCollision;
export const _keep_toggleNPC = toggle;
export const _keep_setAnimation = setAnimation;

export const _keep_getMoveProps = getMoveProps;
export const _keep_findPath = findPath;
export const _keep_clearPath = clearPath;
export const _keep_getPos = getPos;
export const _keep_setPos = setPos;
export const _keep_setPivot = setPivot;
export const _keep_setZIndex = setZIndex;
export const _keep_setAction = setAction;
export const _keep_setSpeed = setSpeed;

export const _keep_makeCollidable = makeCollidable;
export const _keep_getAll = getAll;
