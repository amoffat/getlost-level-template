import { Rect } from "./rect";

export interface BaseMapObj {
  id: string;
  x: number;
  y: number;
  z: number;
  layer: number;
}

export interface TileGroupInstance extends BaseMapObj {
  tileId: string;
  tilesetId: string;
  frame: Rect;
  flipX: boolean;
}

export interface EllipseObj extends BaseMapObj {
  radiusX: number;
  radiusY: number;
}

export interface PolyObj extends BaseMapObj {
  points: { x: number; y: number }[];
}

export interface BoxObj extends BaseMapObj {
  width: number;
  height: number;
}

export type MapObj = TileGroupInstance | EllipseObj | PolyObj | BoxObj;

export type UpdatableParams = Partial<
  BaseMapObj & TileGroupInstance & EllipseObj & PolyObj & BoxObj
>;

export function isTileGroupInstance(
  obj: Partial<BaseMapObj>
): obj is TileGroupInstance {
  return (obj as TileGroupInstance).tileId !== undefined;
}
