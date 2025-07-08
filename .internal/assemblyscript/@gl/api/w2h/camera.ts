import { Matrix } from "../../utils/la/mat";

export declare function setPosition(x: f32, y: f32): void;
export declare function zoom(scale: f32): void;
export declare function localTransform(): Matrix;
export declare function worldTransform(): Matrix;
export declare function getFrame(): Array<f32>;

export const _keep_setPosition = setPosition;
export const _keep_zoom = zoom;
export const _keep_localTransform = localTransform;
export const _keep_worldTransform = worldTransform;
export const _keep_getFrame = getFrame;
