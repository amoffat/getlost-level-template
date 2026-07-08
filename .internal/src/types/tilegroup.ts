import { OklabColor } from "@/types/color";
import { Vector2 } from "@/vec";
import { ConcavePolygon } from "./polygon";
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
  // The grid size this object is aligned to
  gridSize: Vector2;
  // The position of the tilegroup within the tileset
  pos: Rect;
  pinned: boolean;
  zIndices: Vector2[];
  // From 0-1 representing how much of the tile is opaque. Used in sorting.
  coverage: number;
  avgColor: OklabColor;
  hilbertIndex: number;
  // A random UUID assigned to all tilegroups produced by the same reslicer
  // action when more than one tile is created. Used to keep co-created tiles
  // adjacent in the object palette.
  sliceCollection?: string;
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
  obj: TemplateObject,
): obj is TileGroupTemplate {
  return obj.type === TemplateType.TileGroup;
}
