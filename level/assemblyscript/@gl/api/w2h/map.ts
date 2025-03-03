import { MapSize } from "../types/map";
import { TileProperties } from "../types/tile";
import { Vector } from "../types/vector";

export declare function setTint(
  map: u32,
  tile: u32,
  tint: u32,
  layerIdxs: u32[]
): void;
export declare function exit(name: string, force: boolean): void;
export declare function getTileProps(posX: f32, posY: f32): TileProperties;
export declare function loadEntryPosition(): Vector;
export declare function mapSize(): MapSize;
export declare function canvasSize(): Vector;

export const _keep_setTint = setTint;
export const _keep_exit = exit;
export const _keep_getTileProps = getTileProps;
export const _keep_loadEntryPosition = loadEntryPosition;
export const _keep_mapSize = mapSize;
export const _keep_canvasSize = canvasSize;
