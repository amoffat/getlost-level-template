import { WalkSound } from "@/constants";
import { OklabColor } from "@/types/color";
import { Vector2 } from "@/vec";
import type { Rect } from "./rect";
import { TemplateType } from "./templates";
import type { TilesetObjectTemplate } from "./tilesetobject";

export interface TileGroupTemplate {
  // The unique, stable id, which uses the image data hash plus tileset and
  // position. We use this for most lookups because we need to be able to arrive
  // at the correct tileset object even if there are multiple identical images
  // in different tilesets.
  id: string;
  type: TemplateType.TileGroup;
  // The image-hash based id
  imageId: string;
  // The grid size this object is aligned to
  gridSize: Vector2;
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

  // Properties that can vary per-instance
  walkSound: WalkSound;
  friction: number;
  traction: number;
  hidden: boolean;
}

export function isTileGroupTemplate(
  obj: TilesetObjectTemplate
): obj is TileGroupTemplate {
  return obj.type === TemplateType.TileGroup;
}
