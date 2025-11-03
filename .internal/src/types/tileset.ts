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
  tiles: TilesBucket;
}

export enum TilesetObjType {
  TileGroupTemplate = 0,
  AnimationTemplate = 1,
  NpcTemplate = 2,
}
