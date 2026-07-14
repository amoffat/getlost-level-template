import { Vector2 } from "@gl/types/api/vector";
import { CameraTarget, CameraTargetFn, Frame } from "@gl/types/camera";

export declare function setPosition(x: number, y: number): void;
export declare function getEffectiveZoom(): number;
export declare function getUserZoom(): number;
export declare function setUserZoom(scale: number): void;
export declare function localTransform(): Float32Array;
export declare function worldTransform(): Float32Array;
export declare function getFrame(): Frame;
export declare function setTarget(getTarget: CameraTargetFn): void;
export declare function getTarget(): Vector2;
export declare function getTargets(): CameraTarget[];
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
