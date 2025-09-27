import { Rect } from "./rect";

export type Mode =
  | "pan"
  | "place"
  | "select"
  | "move"
  | "rect-select"
  | "duplicate";

export interface MapObj {
  id: string;
  x: number;
  y: number;
  z: number;
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
