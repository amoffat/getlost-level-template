import type { Rect } from "./rect";

export interface TileGroup {
  id: string;
  // The grid size this object is aligned to
  gridSize: number;
  tilesetId: string;
  pos: Rect;
  pinned: boolean;
  zIndices: number[];
  name: string;
  tags: string[];
}
