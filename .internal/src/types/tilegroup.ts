import { OklabColor } from "@/types/color";
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
  // From 0-1 representing how much of the tile is opaque. Used in sorting.
  coverage: number;
  avgColor: OklabColor;
  hilbertIndex: number;
}

interface AnimatedFrame {
  duration: number;
  tileGroup: TileGroup;
}

export interface ObjectAnimation {
  id: string;
  frames: AnimatedFrame[];
}

export type TilesetObject = TileGroup;

export function isTileGroup(obj: TilesetObject): obj is TileGroup {
  return (obj as TileGroup).pinned !== undefined;
}
