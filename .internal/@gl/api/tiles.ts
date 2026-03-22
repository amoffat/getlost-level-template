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
 * @param uid The unique identifier of the tile
 * @param tileset The tileset name of the tile to change.
 * @param animName The name of the animation to play.
 */
export declare function playAnimation(
  uid: number,
  tileset: string,
  animName: string
): void;

/**
 *
 * @param uid The unique identifier of the tile
 * @param tint The tint color
 */
export declare function setTint(uid: number, tint: number): void;

export declare function getTiles(
  tileset: string,
  tileId: number,
  layerNames: string[]
): number[];

/**
 * @param name The name of the object tile to toggle
 * @param enabled Whether the tile should be enabled or disabled
 */
export declare function toggle(name: string, enabled: boolean): void;
