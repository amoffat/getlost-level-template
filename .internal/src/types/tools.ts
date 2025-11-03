import { Vector } from "@/vec";
import type { TileGroupTemplate } from "./tilegroup";

export interface PaintOpts {
  mode: "place-once" | "overwrite" | "stack";
  size: number;
  snap: "grid" | "object" | "free";
}

export interface ColliderOpts {
  type: "box" | "ellipse" | "polygon";
}

export interface MagicPaintOpts {
  candidates: TileGroupTemplate[];
  gridPosFreeze: Vector | null;
}
