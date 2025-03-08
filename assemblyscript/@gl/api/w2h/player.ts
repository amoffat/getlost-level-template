import { PlayerAction } from "../../utils/movement/topdown";

export declare function setVariation(variation: string): void;
export declare function setPos(x: f32, y: f32): void;
export declare function setSize(width: f32, height: f32): void;
export declare function setPivot(x: f32, y: f32): void;
export declare function setZIndex(z: f32): void;
export declare function setAction(anim: PlayerAction): void;
export declare function flip(x: bool, y: bool): void;
export declare function setCollisionBox(
  x: f32,
  y: f32,
  width: f32,
  height: f32
): void;

export const _keep_setVariation = setVariation;
export const _keep_setPos = setPos;
// export const _keep_setSize = setSize;
export const _keep_setPivot = setPivot;
export const _keep_setZIndex = setZIndex;
export const _keep_setAction = setAction;
export const _keep_flip = flip;
// export const _keep_setCollisionBox = setCollisionBox;
