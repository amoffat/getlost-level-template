import { Rect } from "./rect";

export type Mode = "pan" | "place" | "select";

export interface MapObj {
  id: string;
  x: number;
  y: number;
  z: number;
}

export interface TileObj extends MapObj {
  tileId: string;
  tilesetId: string;
  frame: Rect;
  flipX?: boolean;
}
