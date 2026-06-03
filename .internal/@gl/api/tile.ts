/**
 * Replaces a tile in the map with another tile. A tile can currently only be
 * replaced by another tile in the same tileset.
 *
 * @param uid The unique identifier of the tile
 * @param tileset The tileset name of the tile to change.
 * @param id The new tile id to change the tile to.
 */
export declare function change(uid: number, tileset: string, id: number): void;

/**
 * Plays an animated tile.
 *
 * @param id The unique identifier of the tile
 * @param tileset The tileset name of the tile to change.
 * @param animName The name of the animation to play.
 */
export declare function playAnimation(
  id: number,
  tileset: string,
  animName: string,
): void;

/**
 *
 * @param id The unique identifier of the tile
 * @param tint The tint color
 */
export declare function setTint(id: number, tint: number): void;

export declare function getTiles(
  tileset: string,
  tileId: number,
  layerNames: string[],
): number[];

/**
 * @param id The name of the tile object to toggle
 * @param enabled Whether the tile should be enabled or disabled
 */
export declare function toggle(id: string, enabled: boolean): void;
