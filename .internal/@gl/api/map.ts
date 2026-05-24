import type { MapSize } from "@gl/types/api/map";
import type { TileProperties } from "@gl/types/api/tile";
import type { Vector2 } from "@gl/types/api/vector";

/**
 * Exits the player from the current map. The name must have already been
 * provided by the exposed `exits` function in `code/exits.ts`.
 *
 * @param name The name of the exit to use.
 * @param force Whether or not to provide the player with a choice to exit.
 *
 * @return Returns true if the exit was successful, false otherwise.
 */
export declare function exit(name: string, force: boolean): Promise<boolean>;

/**
 * Fetches the merged stack of properties for all tiles at a location. This is
 * currently useful for determining the friction of a tile, for example.
 *
 * @param posX The column of the tile to get properties for.
 * @param posY The row of the tile to get properties for.
 */
export declare function getMergedTileProps(
  posX: number,
  posY: number,
): TileProperties;

/**
 * Fetches the size of the map.
 */
export declare function mapSize(): MapSize;

/**
 * Fetches the size of the canvas.
 */
export declare function canvasSize(): Vector2;
