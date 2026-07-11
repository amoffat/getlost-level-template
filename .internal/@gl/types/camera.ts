import { Vector2 } from "./api/vector";

export interface CameraTarget {
  weight: number;
  pos: Vector2;
}

export type CameraTargetFn = () => CameraTarget[];
