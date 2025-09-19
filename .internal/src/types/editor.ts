import { Rect } from "./rect";

export interface MapObj {
  id: string;
  x: number;
  y: number;
}

export interface TileObj extends MapObj {
  tileId: string;
  tilesetId: string;
  frame: Rect;
  flipX?: boolean;
  z: number;
}
