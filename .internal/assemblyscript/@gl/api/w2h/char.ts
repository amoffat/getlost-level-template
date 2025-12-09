import type { CharAction } from "../../utils/character";
import type { SetAnimationOpts } from "../types/animation";
import type { CharProps } from "../types/char";
import type { Vector } from "../types/vector";

/**
 * Fetches the merged stack of properties for a character. This is currently
 * useful for determining the friction and traction of a character, for example.
 *
 * @param charName The name of the character to get properties for. "player"
 * means the player.
 */
export declare function getMoveProps(charName: string): CharProps;
export declare function getPos(charName: string): Vector;
export declare function setPos(charName: string, x: number, y: number): void;
export declare function setSpeed(charName: string, speed: number): void;
export declare function setAction(charName: string, anim: CharAction): void;
export declare function setZIndex(charName: string, z: number): void;
export declare function setPivot(charName: string, x: number, y: number): void;
export declare function toggle(name: string, enabled: boolean): void;
export declare function setAnimation(
  refId: number,
  name: string,
  opts: SetAnimationOpts
): void;
export declare function checkCollision(
  charName: string,
  posX: number,
  posY: number,
  translationX: number,
  translationY: number
): Vector;
export declare function setMoveSound(
  name: string,
  sound: string,
  volume: number,
  onlyWhileMoving: boolean
): void;
export declare function makeCollidable(name: string, enabled: boolean): void;
export declare function getAll(): string[];
