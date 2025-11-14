import { Vector } from "@/vec";
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
  gridPosFreeze: Vector | null;
}

export interface FillObj {
  tg: TileGroupTemplate;
  prob: number;
  canRemove: boolean;
}

export interface FillOpts {
  candidates: FillObj[];
  clump: number;
  bounds: Rect | null;
}
