import { LayerName } from "./layer";
import { Rect } from "./rect";

export type Mode =
  | "pan"
  | "select"
  | "move"
  | "rect-select"
  | "set-waypoint"
  | "circle-collision"
  | "rect-collision"
  | "paint"
  | "magic-paint"
  | "set-bounds"
  | "set-sound-zones"
  | "set-zoom-zones"
  | "set-water-zones"
  | "add-light"
  | "duplicate";

export interface MapObj {
  id: string;
  x: number;
  y: number;
  z: number;
  layer: LayerName;
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
