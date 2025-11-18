import { WalkSound } from "@/constants";
import { RgbColor } from "./color";
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

interface TilesetMapObj extends BaseMapObj {
  // The id of the underlying tileset object
  tsObjId: string;
  tilesetId: string;
}

export interface TileGroupInstance extends TilesetMapObj {
  type: MapObjType.TileGroupInstance;

  imageId: string; // for healing broken references

  // Properties that can vary per-instance
  flipX?: boolean;
  name?: string;
  tags?: string[];
  walkSound?: WalkSound;
  friction?: number;
  traction?: number;
  sink?: number;
}

export interface TileAnimationFrame {
  // The id of the underlying tileset object
  tileId: string;
  frame: Rect;
  time: number;
}

export interface AnimationInstance extends TilesetMapObj {
  type: MapObjType.AnimationInstance;

  // Properties that can vary per-instance
  flipX?: boolean;
  name?: string;
  tags?: string[];
}

export interface NpcInstance extends TilesetMapObj {
  type: MapObjType.NpcInstance;

  // Properties that can vary per-instance
  flipX?: boolean;
  name?: string;
  tags?: string[];
}

export interface LightObj extends TilesetMapObj {
  type: MapObjType.Light;
  color: RgbColor;
  intensity: number;
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
export type MapObj =
  | TileGroupInstance
  | AnimationInstance
  | NpcInstance
  | LightObj
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

export function isLightInstance(obj: Partial<BaseMapObj>): obj is LightObj {
  return obj.type === MapObjType.Light;
}
