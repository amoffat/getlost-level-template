import { Vector2 } from "@gl/types/api/vector";
import { CameraTargetFn } from "@gl/types/camera";
import { Matrix } from "@gl/utils/mat";

export declare function setPosition(x: number, y: number): void;
export declare function getEffectiveZoom(): number;
export declare function getUserZoom(): number;
export declare function setUserZoom(scale: number): void;
export declare function localTransform(): Matrix;
export declare function worldTransform(): Matrix;
export declare function getFrame(): number[];
export declare function setTarget(getTarget: CameraTargetFn): void;
export declare function getTarget(): Vector2;
export declare function setOffset(pos: Vector2 | null): void;
export declare function shake({
  magnitude,
  durationMs,
  easing,
  speed,
}: {
  magnitude?: number;
  durationMs?: number;
  easing?: string;
  speed?: number;
}): void;
