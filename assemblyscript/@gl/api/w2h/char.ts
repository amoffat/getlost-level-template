import { CharProps } from "../types/char";

/**
 * Fetches the merged stack of properties for a character. This is currently
 * useful for determining the friction and traction of a character, for example.
 *
 * @param charName The name of the character to get properties for. "player"
 * means the player.
 */
export declare function getMoveProps(charName: string): CharProps;

export const _keep_getMoveProps = getMoveProps;
