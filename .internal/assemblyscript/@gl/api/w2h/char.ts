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

export const _keep_getMoveProps = getMoveProps;
export const _keep_findPath = findPath;
export const _keep_clearPath = clearPath;
