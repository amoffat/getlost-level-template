import { Rect } from "./rect";

export enum MapObjType {
  TileGroupInstance = 0,
  AnimationInstance = 1,
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
  // The id of the underlying tileset object
  tsObjId: string;
  tilesetId: string;

  width: number;
  height: number;

  // Properties that can vary per-instance
  flipX: boolean;
  name?: string;
  tags?: string[];
}

export interface TileAnimationFrame {
  // The id of the underlying tileset object
  tileId: string;
  frame: Rect;
  time: number;
}

export interface AnimationInstance extends BaseMapObj {
  type: MapObjType.AnimationInstance;
  // The id of the underlying tileset object
  tsObjId: string;
  tilesetId: string;

  // Convenience, so I don't have to dig through the frames
  width: number;
  height: number;

  // Properties that can vary per-instance
  flipX: boolean;
  name?: string;
  tags?: string[];
}

export interface NpcInstance extends BaseMapObj {
  type: MapObjType.NpcInstance;
  // The id of the underlying tileset object
  tsObjId: string;
  tilesetId: string;

  // Convenience, so I don't have to dig through the animation frames
  width: number;
  height: number;

  // Properties that can vary per-instance
  flipX: boolean;
  name?: string;
  tags?: string[];
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
  | AnimationInstance
  | NpcInstance
  | EllipseObj
  | PolyObj
  | BoxObj;

export type MapObjsFromTileset =
  | TileGroupInstance
  | AnimationInstance
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
): obj is AnimationInstance {
  return obj.type === MapObjType.AnimationInstance;
}

export function isNpcInstance(obj: Partial<BaseMapObj>): obj is NpcInstance {
  return obj.type === MapObjType.NpcInstance;
}

export function isMapObjFromTileset(
  obj: Partial<BaseMapObj>
): obj is MapObjsFromTileset {
  return (
    isTileGroupInstance(obj) || isAnimatedInstance(obj) || isNpcInstance(obj)
  );
}
