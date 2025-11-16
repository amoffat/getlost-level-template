import { Vector2 } from "@/vec";
import { Rect } from "./rect";
import type { TileGroupTemplate } from "./tilegroup";

export interface PaintOpts {
  mode: "place-once" | "overwrite" | "stack";
  size: number;
  snap: "grid" | "object" | "free";
}

export interface ColliderOpts {
  type: "box" | "ellipse" | "polygon";
}

export interface AutotilerOpts {
  candidates: TileGroupTemplate[];
  gridPosFreeze: Vector2 | null;
}

export interface FillObj {
  tg: TileGroupTemplate;
  prob: number;
  canRemove: boolean;
}

export interface FillOpts {
  candidates: FillObj[];
  density: number;
  bounds: Rect | null;
}
