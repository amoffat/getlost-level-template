import { Rect } from "./rect";

export enum MapObjType {
  TileGroupInstance = 0,
  AnimatedInstance = 1,
  NpcInstance = 2,
  EllipseCollider = 3,
  BoxCollider = 4,
  PolyCollider = 5,
}

export interface BaseMapObj {
  id: string;
  type: MapObjType;
  x: number;
  y: number;
  z: number;
  layer: number;
}
export interface TileGroupInstance extends BaseMapObj {
  type: MapObjType.TileGroupInstance;
  tileId: string;
  tilesetId: string;
  frame: Rect;
  flipX: boolean;
}

export interface AnimatedInstance extends BaseMapObj {
  type: MapObjType.AnimatedInstance;
  animId: string;
  tilesetId: string;
  frames: { tileId: string; frame: Rect; time: number }[];
  flipX: boolean;
}

export interface NpcInstance extends BaseMapObj {
  type: MapObjType.NpcInstance;
  npcId: string;
  tilesetId: string;
  name: string;
}

export interface EllipseObj extends BaseMapObj {
  type: MapObjType.EllipseCollider;
  radiusX: number;
  radiusY: number;
}
export interface BoxObj extends BaseMapObj {
  type: MapObjType.BoxCollider;
  width: number;
  height: number;
}
export interface PolyObj extends BaseMapObj {
  type: MapObjType.PolyCollider;
  points: { x: number; y: number }[];
}
export type MapObj =
  | TileGroupInstance
  | AnimatedInstance
  | NpcInstance
  | EllipseObj
  | PolyObj
  | BoxObj;

export type MapObjsFromTileset =
  | TileGroupInstance
  | AnimatedInstance
  | NpcInstance;

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
): obj is AnimatedInstance {
  return obj.type === MapObjType.AnimatedInstance;
}

export function isNpcInstance(obj: Partial<BaseMapObj>): obj is NpcInstance {
  return obj.type === MapObjType.NpcInstance;
}
