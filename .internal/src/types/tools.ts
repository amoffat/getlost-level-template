import { Vector } from "@/vec";
import type { TileGroup } from "./tilegroup";

export interface PaintOpts {
  mode: "place-once" | "overwrite" | "stack";
  size: number;
}

export interface MagicPaintOpts {
  candidates: TileGroup[];
  gridPosFreeze: Vector | null;
}
