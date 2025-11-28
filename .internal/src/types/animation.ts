import { Vector2 } from "@/vec";
import { AnimationProps } from "./properties";
import { TemplateType } from "./templates";
import { TileGroupTemplate } from "./tilegroup";
import type { TilesetObjectTemplate } from "./tilesetobject";

export interface TileAnimationFrame {
  tg: TileGroupTemplate;
  time: number; // ms to display this frame
}
export interface AnimationTemplate extends AnimationProps {
  // The unique, stable id which is based on a hash of the frame ids and times
  id: string;
  type: TemplateType.Animation;
  tilesetId: string;
  // The grid size this object is aligned to
  gridSize: Vector2;
  frames: TileAnimationFrame[];
}
export function isAnimationTemplate(
  obj: TilesetObjectTemplate
): obj is AnimationTemplate {
  return obj.type === TemplateType.Animation;
}
