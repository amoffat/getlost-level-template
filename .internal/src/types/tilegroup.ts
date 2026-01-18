import { OklabColor } from "@/types/color";
import { ConcavePolygon } from "@/utils/polygon";
import { Vector2 } from "@/vec";
import { TileGroupProps } from "./properties";
import type { Rect } from "./rect";
import { TemplateType } from "./templates";
import type { TemplateObject } from "./tilesetobject";

export interface TileGroupTemplate extends TileGroupProps {
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
  // From 0-1 representing how much of the tile is opaque. Used in sorting.
  coverage: number;
  avgColor: OklabColor;
  hilbertIndex: number;
  collisions: {
    // UUID key for looking up collision mask data from the module-level mask
    // store
    mask: string | null;
    // Computed collision shapes (potentially multiple islands)
    shapes: ConcavePolygon[];
    simplify: number;
  };
}

export function isTileGroupTemplate(
  obj: TemplateObject
): obj is TileGroupTemplate {
  return obj.type === TemplateType.TileGroup;
}
