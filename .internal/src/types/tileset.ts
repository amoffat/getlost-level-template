import { EntityState } from "@reduxjs/toolkit";
import { TemplateObject } from "./tilesetobject";
import { Vector2 } from "@/vec";

export type Mode =
  | "select"
  | "pan"
  | "add-group"
  | "delete-group"
  | "animate"
  | "reslice-tiles"
  | "make-npc"
  | "z-index"
  | "draw-colliders"
  | "replace-group";

type TilesBucket = EntityState<TemplateObject, string>;

export interface Tileset {
  id: string;
  objectUrl: string;
  saved: boolean;
  width: number;
  height: number;
  gridSize: Vector2;
  tiles: TilesBucket;
  // A composite tileset combines multiple source tilesets into one, which
  // implies that it has no innate grid size (a grid size of 1x1)
  composite: boolean;
  // An alias for an internal/system tileset
  hidden?: boolean;
  restricted?: boolean;
}

export type SavedTileset = Omit<Tileset, "objectUrl" | "saved" | "restricted">;
