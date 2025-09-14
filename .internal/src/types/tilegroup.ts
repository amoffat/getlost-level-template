import type { Rect } from "./rect";

export interface TileGroup {
  id: string;
  // The grid size this object is aligned to
  gridSize: number;
  tilesetId: string;
  objectUrl: string;
  pos: Rect;
  singleTile: boolean;
  children?: TileGroup[];
}
