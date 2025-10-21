import { EntityState } from "@reduxjs/toolkit";
import { TileGroup } from "./tilegroup";

export type Mode =
  | "select"
  | "pan"
  | "add-group"
  | "delete-group"
  | "animate"
  | "replace-group";

type TilesBucket = EntityState<TileGroup, string>;

export interface Tileset {
  id: string;
  objectUrl: string;
  saved: boolean;
  tiles: TilesBucket;
}
