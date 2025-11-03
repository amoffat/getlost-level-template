import { OklabColor } from "@/types/color";
import type { Rect } from "./rect";
import { TilesetObjType } from "./tileset";
import type { TilesetObjectTemplate } from "./tilesetobject";

export interface TileGroupTemplate {
  // The unique, stable id, which uses the image data hash plus tileset and
  // position
  id: string;
  type: TilesetObjType.TileGroupTemplate;
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

export function isTileGroupTemplate(
  obj: TilesetObjectTemplate
): obj is TileGroupTemplate {
  return obj.type === TilesetObjType.TileGroupTemplate;
}
