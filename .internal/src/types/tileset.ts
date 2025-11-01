import { EntityState } from "@reduxjs/toolkit";
import { TilesetObject } from "./tilesetobject";

export type Mode =
  | "select"
  | "pan"
  | "add-group"
  | "delete-group"
  | "animate"
  | "reslice-tiles"
  | "make-npc"
  | "replace-group";

type TilesBucket = EntityState<TilesetObject, string>;

export interface Tileset {
  id: string;
  objectUrl: string;
  saved: boolean;
  tiles: TilesBucket;
}
