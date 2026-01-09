import { OklabColor } from "@/types/color";
import { Vector2 } from "@/vec";
import type { Ellipse } from "./ellipse";
import { TileGroupProps } from "./properties";
import type { Rect } from "./rect";
import { TemplateType } from "./templates";
import type { TemplateObject } from "./tilesetobject";

export type CollisionShape = Rect | Ellipse;

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
  // UUID key for looking up collision mask data from the module-level mask store
  collisionMask: string | null;
  // Computed collision shapes (rectangles/ellipses) that cover the mask
  collisionShapes: CollisionShape[];
}

export function isTileGroupTemplate(
  obj: TemplateObject
): obj is TileGroupTemplate {
  return obj.type === TemplateType.TileGroup;
}
