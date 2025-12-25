import { HasId, RequiredButMaybeUndefined } from "@/utils/misc";
import { EntityState } from "@reduxjs/toolkit";
import type { MapLayerName } from "./layer";
import {
  AnimationProps,
  EntranceProps,
  ExitProps,
  LightProps,
  NpcProps,
  PickupProps,
  TileGroupProps,
} from "./properties";
import { Rect } from "./rect";

export interface SavedMap {
  tileWidth: number;
  tileHeight: number;
  bounds: Rect;
  objects: EntityState<MapObj, string>;
  templates: {
    lights: LightProps & HasId;
    entryGateways: EntranceProps & HasId;
    exitGateways: ExitProps & HasId;
    pickups: PickupProps & HasId;
  };
}

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
  Pickup = 10,
}

// The base interface for all playable map objects
export interface BaseMapObj {
  id: string;
  type: MapObjType;
  x: number;
  y: number;
  z: number;
  layer: MapLayerName;
  width: number;
  height: number;
}

// This is a base interface for objects are linked to a tileset. This includes
// both tile groups that are visible in the map, and things like lights and
// exits, because their icons are stored in a hidden tileset.
export interface TilesetMapObj extends BaseMapObj {
  // The id of the underlying tileset object
  tsObjId: string;
  tilesetId: string;
}

export interface TileGroupInstance
  extends TilesetMapObj, RequiredButMaybeUndefined<TileGroupProps> {
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
  extends TilesetMapObj, RequiredButMaybeUndefined<AnimationProps> {
  type: MapObjType.AnimationInstance;
}

export interface NpcInstance
  extends TilesetMapObj, RequiredButMaybeUndefined<NpcProps> {
  type: MapObjType.NpcInstance;
}

export interface LightObj
  extends TilesetMapObj, RequiredButMaybeUndefined<LightProps> {
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

export interface EntranceObj
  extends TilesetMapObj, RequiredButMaybeUndefined<EntranceProps> {
  type: MapObjType.Entry;
}

export interface ExitObj
  extends TilesetMapObj, RequiredButMaybeUndefined<ExitProps> {
  type: MapObjType.Exit;
}

export interface PickupObj
  extends TilesetMapObj, RequiredButMaybeUndefined<PickupProps> {
  type: MapObjType.Pickup;
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
  | ExitObj
  | PickupObj;

export type MapObjProps =
  | LightProps
  | EntranceProps
  | ExitProps
  | PickupProps
  | AnimationProps
  | TileGroupProps
  | NpcProps;

export type ExtractProps<T extends MapObj> = T extends LightObj
  ? LightProps
  : T extends EntranceObj
    ? EntranceProps
    : T extends ExitObj
      ? ExitProps
      : T extends PickupObj
        ? PickupProps
        : T extends AnimationInstance
          ? AnimationProps
          : T extends TileGroupInstance
            ? TileGroupProps
            : T extends NpcInstance
              ? NpcProps
              : never;

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

export function isNpcInstance(obj: Partial<MapObj>): obj is NpcInstance {
  return obj.type === MapObjType.NpcInstance;
}

export function isMapObjFromTileset(
  obj: Partial<BaseMapObj>
): obj is TilesetMapObj {
  return Object.hasOwn(obj, "tsObjId") && Object.hasOwn(obj, "tilesetId");
}

export function isLightInstance(obj: Partial<MapObj>): obj is LightObj {
  return obj.type === MapObjType.Light;
}

export function isEntranceObj(obj: Partial<MapObj>): obj is EntranceObj {
  return obj.type === MapObjType.Entry;
}

export function isExitObj(obj: Partial<MapObj>): obj is ExitObj {
  return obj.type === MapObjType.Exit;
}

export function isPickupObj(obj: Partial<MapObj>): obj is PickupObj {
  return obj.type === MapObjType.Pickup;
}
