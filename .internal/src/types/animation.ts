import { TileGroupTemplate } from "./tilegroup";
import { TilesetObjType } from "./tileset";
import type { TilesetObjectTemplate } from "./tilesetobject";

export interface TileAnimationFrame {
  tg: TileGroupTemplate;
  time: number; // ms to display this frame
}
export interface AnimationTemplate {
  // The unique, stable id which is based on a hash of the frame ids and times
  id: string;
  type: TilesetObjType.AnimationTemplate;
  tilesetId: string;
  frames: TileAnimationFrame[];
  tags: string[];
  names: string[];
}
export function isAnimationTemplate(
  obj: TilesetObjectTemplate
): obj is AnimationTemplate {
  return obj.type === TilesetObjType.AnimationTemplate;
}
