import type { Rect } from "./rect";

export interface TileGroup {
  // The grid size this object is aligned to
  gridSize: number;
  objectUrl: string;
  pos: Rect;
  singleTile: boolean;
}
