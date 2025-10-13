import { Rect } from "./rect";

export interface MapObj {
  id: string;
  x: number;
  y: number;
  z: number;
  layer: number;
}

export interface TileGroupInstance extends MapObj {
  tileId: string;
  tilesetId: string;
  frame: Rect;
  flipX: boolean;
}

export function isTileGroupInstance(
  obj: Partial<MapObj>
): obj is TileGroupInstance {
  return (obj as TileGroupInstance).tileId !== undefined;
}
