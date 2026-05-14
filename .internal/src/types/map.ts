import { HasId, RequiredButMaybeUndefined } from "@/utils/misc";
import type { Vector2 } from "@/vec";
import { EntityState } from "@reduxjs/toolkit";
import { Card } from "./card";
import type { MapLayerName } from "./layer";
import { ConcavePolygon } from "./polygon";
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
  card: Card | null;
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
  CollisionZone = 5,
  Light = 6,
  Entry = 7,
  Exit = 8,
  Waypoint = 9,
  Pickup = 10,
  BackgroundImage = 11,
  SinkZone = 12,
  SoundZone = 13,
  ZoomZone = 14,
  SensorZone = 15,
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

/** Shared shape for all painted zone object types */
export interface BaseZoneObj extends BaseMapObj {
  shapes: ConcavePolygon[];
  simplify: number;
  /**
   * Linear quadtree mask painted by the zone paint tool.
   * Keys are `${level}:${bx}:${by}` where level ∈ {1,2,4,8,16}.
   * This is the editor's source of truth; `shapes` is derived from it.
   */
  quadMask: Record<string, boolean>;
  // We hide the object while painting
  hidden: boolean;
}

export interface CollisionObj extends BaseZoneObj {
  type: MapObjType.CollisionZone;
}

export interface SinkZoneObj extends BaseZoneObj {
  type: MapObjType.SinkZone;
  depth: number;
  padding: number;
}

export interface SoundZoneObj extends BaseZoneObj {
  type: MapObjType.SoundZone;
  sound: string;
  padding: number;
  volume: number;
}

export interface ZoomZoneObj extends BaseZoneObj {
  type: MapObjType.ZoomZone;
  zoom: number;
  padding: number;
}

export interface SensorZoneObj extends BaseZoneObj {
  type: MapObjType.SensorZone;
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

export interface BackgroundImageObj extends BaseMapObj {
  type: MapObjType.BackgroundImage;
  /** SHA-1 hash of the PNG bytes — used as the filename on disk. */
  imageId: string;
  /**
   * Parallax scroll factor. `{ x: 1, y: 1 }` means the layer moves at the
   * same speed as the camera (no parallax). Values < 1 scroll slower (appear
   * further away);
   */
  parallax: Vector2;
  /** When true, the image tiles infinitely in the horizontal direction. */
  tileX: boolean;
  /** When true, the image tiles infinitely in the vertical direction. */
  tileY: boolean;
}

export type MapObj =
  | TileGroupInstance
  | AnimationInstance
  | NpcInstance
  | LightObj
  | CollisionObj
  | SinkZoneObj
  | SoundZoneObj
  | ZoomZoneObj
  | SensorZoneObj
  | EntranceObj
  | ExitObj
  | PickupObj
  | BackgroundImageObj;

export interface SpeakableProps {
  speakerImageId: string | null;
  nameKey: string | null;
  talkable: boolean;
}

export type SpeakableMapObj = Extract<
  MapObj,
  RequiredButMaybeUndefined<SpeakableProps>
>;

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
  obj: Partial<BaseMapObj>,
): obj is TileGroupInstance {
  return obj.type === MapObjType.TileGroupInstance;
}

export function isCollisionZone(obj: Partial<BaseMapObj>): obj is CollisionObj {
  return obj.type === MapObjType.CollisionZone;
}

export function isAnimatedInstance(
  obj: Partial<BaseMapObj>,
): obj is AnimationInstance {
  return obj.type === MapObjType.AnimationInstance;
}

export function isNpcInstance(obj: Partial<MapObj>): obj is NpcInstance {
  return obj.type === MapObjType.NpcInstance;
}

export function isSpeakableObject(obj: MapObj): obj is SpeakableMapObj {
  return isNpcInstance(obj) || isTileGroupInstance(obj);
}

export function isMapObjFromTileset(
  obj: Partial<BaseMapObj>,
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

export function isBackgroundImageObj(
  obj: Partial<MapObj>,
): obj is BackgroundImageObj {
  return obj.type === MapObjType.BackgroundImage;
}

export function isCollisionZoneObj(
  obj: Partial<BaseMapObj>,
): obj is SinkZoneObj {
  return obj.type === MapObjType.CollisionZone;
}

export function isSinkZoneObj(obj: Partial<BaseMapObj>): obj is SinkZoneObj {
  return obj.type === MapObjType.SinkZone;
}

export function isSoundZoneObj(obj: Partial<BaseMapObj>): obj is SoundZoneObj {
  return obj.type === MapObjType.SoundZone;
}

export function isZoomZoneObj(obj: Partial<BaseMapObj>): obj is ZoomZoneObj {
  return obj.type === MapObjType.ZoomZone;
}

export function isSensorZoneObj(
  obj: Partial<BaseMapObj>,
): obj is SensorZoneObj {
  return obj.type === MapObjType.SensorZone;
}

export type ZoneObj =
  | CollisionObj
  | SinkZoneObj
  | SoundZoneObj
  | ZoomZoneObj
  | SensorZoneObj;

/** Returns true if the object is any painted zone type */
export function isZoneObj(obj: Partial<BaseMapObj>): obj is ZoneObj {
  return (
    obj.type === MapObjType.CollisionZone ||
    obj.type === MapObjType.SinkZone ||
    obj.type === MapObjType.SoundZone ||
    obj.type === MapObjType.ZoomZone ||
    obj.type === MapObjType.SensorZone
  );
}
