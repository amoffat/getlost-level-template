import type { WavyParams } from "@gl/actions/WavyAction";
import type { SetAnimationOpts } from "@gl/types/api/animation";
import type { CharProps } from "@gl/types/api/char";
import type { Vector2 } from "@gl/types/api/vector";
import type { CharAction } from "@gl/types/character";

/**
 * Fetches the merged stack of properties for a character. This is currently
 * useful for determining the friction and traction of a character, for example.
 *
 * @param id The name of the character to get properties for.
 */
export declare function getMoveProps(id: string): CharProps;
export declare function getPos(id: string): Vector2;
export declare function setPos(id: string, x: number, y: number): void;
export declare function getHeight(id: string): number;
export declare function setHeight(id: string, h: number): void;
export declare function setShadow(id: string, enabled: boolean): void;
export declare function setSpeed(id: string, speed: number): void;
export declare function setAction(id: string, anim: CharAction): void;
export declare function setWavy(id: string, params: Partial<WavyParams>): void;
export declare function setColorOverlay({
  id,
  color,
  alpha,
}: {
  id: string;
  color: number;
  alpha: number;
}): void;
export declare function getAlpha(id: string): number;
export declare function setAlpha({
  id,
  alpha,
}: {
  id: string;
  alpha: number;
}): void;
export declare function setZIndex(id: string, z: number): void;
export declare function setPivot(id: string, x: number, y: number): void;
export declare function toggle(id: string, enabled: boolean): void;
export declare function setAnimation(
  refId: number,
  id: string,
  opts: SetAnimationOpts,
): void;
export declare function checkCollision({
  id,
  pos,
  translation,
}: {
  id: string;
  pos: Vector2;
  translation: Vector2;
}): Vector2;
export declare function setMoveSound({
  id,
  sound,
  volume,
  onlyWhileMoving,
}: {
  id: string;
  sound: string;
  volume?: number;
  onlyWhileMoving: boolean;
}): void;
export declare function makeCollidable(id: string, enabled: boolean): void;
export declare function getAll(): string[];
