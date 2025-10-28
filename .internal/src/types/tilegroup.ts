import { OklabColor } from "@/types/color";
import type { TileAnimationFrame } from "./animation";
import type { Rect } from "./rect";

export interface TileGroup {
  // The unique id, which uses the image data hash plus tileset and position
  id: string;
  // The image-hash based id
  imageId: string;
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

export interface ObjectAnimation {
  id: string;
  frames: TileAnimationFrame[];
  names: string[];
}

export type TilesetObject = TileGroup | ObjectAnimation;

export function isTileGroup(obj: TilesetObject): obj is TileGroup {
  return (obj as TileGroup).pinned !== undefined;
}

export function isObjectAnimation(obj: TilesetObject): obj is ObjectAnimation {
  return (obj as ObjectAnimation).frames !== undefined;
}
