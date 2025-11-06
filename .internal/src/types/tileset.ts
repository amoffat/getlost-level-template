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
}

export enum TilesetObjType {
  TileGroupTemplate = 0,
  AnimationTemplate = 1,
  NpcTemplate = 2,
}
