import type { Rect } from "./rect";

export interface TileGroup {
  id: string;
  // The grid size this object is aligned to
  gridSize: number;
  tilesetId: string;
  pos: Rect;
  singleTile: boolean;
  pinned: boolean;
  children: string[];
  zIndices: number[];
  name: string;
  tags: string[];
}
