import { MapSize } from "../types/map";
import { TileProperties } from "../types/tile";
import { Vector } from "../types/vector";

/**
 * Exits the player from the current map. The name must have already been
 * provided by the exposed `exits` function in `code/exits.ts`.
 *
 * @param name The name of the exit to use.
 * @param force Whether or not to provide the player with a choice to exit.
 */
export declare function exit(name: string, force: bool): void;

/**
 * Fetches the merged stack of properties for all tiles at a location. This is
 * currently useful for determining the friction of a tile, for example.
 *
 * @param posX The column of the tile to get properties for.
 * @param posY The row of the tile to get properties for.
 */
export declare function getTileProps(posX: f32, posY: f32): TileProperties;

/**
 * Loads the entry position of the player in the current map.
 */
export declare function loadEntryPosition(): Vector;

/**
 * Fetches the size of the map.
 */
export declare function mapSize(): MapSize;

/**
 * Fetches the size of the canvas.
 */
export declare function canvasSize(): Vector;

export const _keep_exit = exit;
export const _keep_getTileProps = getTileProps;
export const _keep_loadEntryPosition = loadEntryPosition;
export const _keep_mapSize = mapSize;
export const _keep_canvasSize = canvasSize;
