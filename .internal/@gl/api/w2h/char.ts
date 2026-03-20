import type { CharAction } from "../../utils/character";
import type { SetAnimationOpts } from "../types/animation";
import type { CharProps } from "../types/char";
import type { Vector } from "../types/vector";

/**
 * Fetches the merged stack of properties for a character. This is currently
 * useful for determining the friction and traction of a character, for example.
 *
 * @param name The name of the character to get properties for. "player"
 * means the player.
 */
export declare function getMoveProps(name: string): CharProps;
export declare function getPos(name: string): Vector;
export declare function setPos(name: string, x: number, y: number): void;
export declare function setSpeed(name: string, speed: number): void;
export declare function setAction(name: string, anim: CharAction): void;
export declare function setColorOverlay({
  name,
  color,
  alpha,
}: {
  name: string;
  color: number;
  alpha: number;
}): void;
export declare function setAlpha({
  name,
  alpha,
}: {
  name: string;
  alpha: number;
}): void;
export declare function setZIndex(name: string, z: number): void;
export declare function setPivot(name: string, x: number, y: number): void;
export declare function toggle(name: string, enabled: boolean): void;
export declare function setAnimation(
  refId: number,
  name: string,
  opts: SetAnimationOpts,
): void;
export declare function checkCollision({
  name,
  pos,
  translation,
}: {
  name: string;
  pos: Vector;
  translation: Vector;
}): Vector;
export declare function setMoveSound({
  name,
  sound,
  volume,
  onlyWhileMoving,
}: {
  name: string;
  sound: string;
  volume?: number;
  onlyWhileMoving: boolean;
}): void;
export declare function makeCollidable(name: string, enabled: boolean): void;
export declare function getAll(): string[];
