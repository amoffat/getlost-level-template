import { EntityState } from "@reduxjs/toolkit";
import { TilesetObjectTemplate } from "./tilesetobject";

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

type TilesBucket = EntityState<TilesetObjectTemplate, string>;

export interface Tileset {
  id: string;
  objectUrl: string;
  saved: boolean;
  width: number;
  height: number;
  tiles: TilesBucket;
  // A composite tileset combines multiple source tilesets into one, which
  // implies that it has no innate grid size (a grid size of 1x1)
  composite: boolean;
  hidden?: boolean;
}

export type SavedTileset = Omit<Tileset, "objectUrl" | "saved">;
