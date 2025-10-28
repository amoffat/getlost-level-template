import { EntityState } from "@reduxjs/toolkit";
import { TilesetObject } from "./tilegroup";

export type Mode =
  | "select"
  | "pan"
  | "add-group"
  | "delete-group"
  | "animate"
  | "replace-group";

type TilesBucket = EntityState<TilesetObject, string>;

export interface Tileset {
  id: string;
  objectUrl: string;
  saved: boolean;
  tiles: TilesBucket;
}
