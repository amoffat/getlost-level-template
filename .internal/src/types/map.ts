import {
  AnimationProps,
  EntranceProps,
  ExitProps,
  LightProps,
  NpcProps,
  TileGroupProps,
} from "./properties";
import { Rect } from "./rect";

export enum MapObjType {
  TileGroupInstance = 0,
  AnimationInstance = 1,
  NpcInstance = 2,
  EllipseCollider = 3,
  BoxCollider = 4,
  PolyCollider = 5,
  Light = 6,
  Entry = 7,
  Exit = 8,
  Waypoint = 9,
}

export interface BaseMapObj {
  id: string;
  type: MapObjType;
  x: number;
  y: number;
  z: number;
  layer: number;
  width: number;
  height: number;
}

export interface TilesetMapObj extends BaseMapObj {
  // The id of the underlying tileset object
  tsObjId: string;
  tilesetId: string;
}

export interface TileGroupInstance
  extends TilesetMapObj,
    Partial<TileGroupProps> {
  type: MapObjType.TileGroupInstance;

  imageId: string; // for healing broken references
}

export interface TileAnimationFrame {
  // The id of the underlying tileset object
  tileId: string;
  frame: Rect;
  time: number;
}

export interface AnimationInstance
  extends TilesetMapObj,
    Partial<AnimationProps> {
  type: MapObjType.AnimationInstance;
}

export interface NpcInstance extends TilesetMapObj, Partial<NpcProps> {
  type: MapObjType.NpcInstance;
}

export interface LightObj extends TilesetMapObj, Partial<LightProps> {
  type: MapObjType.Light;
}

export interface EllipseObj extends BaseMapObj {
  type: MapObjType.EllipseCollider;
}
export interface BoxObj extends BaseMapObj {
  type: MapObjType.BoxCollider;
}
export interface PolyObj extends BaseMapObj {
  type: MapObjType.PolyCollider;
  points: { x: number; y: number }[];
}

export interface EntranceObj extends TilesetMapObj, Partial<EntranceProps> {
  type: MapObjType.Entry;
}

export interface ExitObj extends TilesetMapObj, Partial<ExitProps> {
  type: MapObjType.Exit;
}

export type MapObj =
  | TileGroupInstance
  | AnimationInstance
  | NpcInstance
  | LightObj
  | EllipseObj
  | PolyObj
  | BoxObj
  | EntranceObj
  | ExitObj;

export function isTileGroupInstance(
  obj: Partial<BaseMapObj>
): obj is TileGroupInstance {
  return obj.type === MapObjType.TileGroupInstance;
}
export function isColliderEllipse(obj: Partial<BaseMapObj>): obj is EllipseObj {
  return obj.type === MapObjType.EllipseCollider;
}
export function isColliderPoly(obj: Partial<BaseMapObj>): obj is PolyObj {
  return obj.type === MapObjType.PolyCollider;
}
export function isColliderBox(obj: Partial<BaseMapObj>): obj is BoxObj {
  return obj.type === MapObjType.BoxCollider;
}

export function isAnimatedInstance(
  obj: Partial<BaseMapObj>
): obj is AnimationInstance {
  return obj.type === MapObjType.AnimationInstance;
}

export function isNpcInstance(obj: Partial<BaseMapObj>): obj is NpcInstance {
  return obj.type === MapObjType.NpcInstance;
}

export function isMapObjFromTileset(
  obj: Partial<BaseMapObj>
): obj is TilesetMapObj {
  return Object.hasOwn(obj, "tsObjId") && Object.hasOwn(obj, "tilesetId");
}

export function isLightInstance(obj: Partial<BaseMapObj>): obj is LightObj {
  return obj.type === MapObjType.Light;
}

export function isEntranceObj(obj: Partial<BaseMapObj>): obj is EntranceObj {
  return obj.type === MapObjType.Entry;
}

export function isExitObj(obj: Partial<BaseMapObj>): obj is ExitObj {
  return obj.type === MapObjType.Exit;
}
