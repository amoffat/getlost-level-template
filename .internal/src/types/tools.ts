import { Vector2 } from "@/vec";
import { Rect } from "./rect";
import type { BrushShape, PaintMode, ZoneType } from "./zone";
import type { TileGroupTemplate } from "./tilegroup";

export interface PaintOpts {
  mode: "place-once" | "overwrite" | "stack";
  size: number;
  snap: "grid" | "object" | "free";
}

export interface ZonePaintOpts {
  mode: PaintMode;
  brushSize: number;
  brushShape: BrushShape;
  overlayOpacity: number;
  showColliders: boolean;
  simplify: number;
  zoneType: ZoneType;
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

export interface CandidateAnimFrame {
  tileGroup: TileGroupTemplate;
  weight: number; // 0-1 fraction representing time allocation
}

export interface AnimatorOpts {
  frames: CandidateAnimFrame[];
  totalTime: number;
}
