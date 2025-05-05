/**
 * Replaces a tile in the map with another tile. A tile can currently only be
 * replaced by another tile in the same tileset.
 *
 * @param uid The unique identifier of the tile
 * @param tileset The tileset name of the tile to change.
 * @param id The new tile id to change the tile to.
 */
export declare function change(uid: u32, tileset: string, id: u32): void;

/**
 * Plays an animated tile.
 *
 * @param uid The unique identifier of the tile
 * @param tileset The tileset name of the tile to change.
 * @param animName The name of the animation to play.
 */
export declare function playAnimation(
  uid: u32,
  tileset: string,
  animName: string
): void;

/**
 *
 * @param uid The unique identifier of the tile
 * @param tint The tint color
 */
export declare function setTint(uid: u32, tint: u32): void;

export declare function getTiles(
  tileset: string,
  tileId: u32,
  layerNames: string[]
): u32[];

export const _keep_setTint = setTint;
export const _keep_change = change;
export const _keep_playAnimation = playAnimation;
export const _keep_getTiles = getTiles;
