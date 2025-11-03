import { TileGroupTemplate } from "./tilegroup";
import { TilesetObjType } from "./tileset";
import type { TilesetObject } from "./tilesetobject";

export type TileAnimationFrame = {
  tg: TileGroupTemplate;
  time: number; // ms to display this frame
};
export interface ObjectAnimationTemplate {
  // The unique, stable id which is based on a hash of the frame ids and times
  id: string;
  type: TilesetObjType.ObjectAnimationTemplate;
  tilesetId: string;
  frames: TileAnimationFrame[];
  tags: string[];
  names: string[];
}
export function isObjectAnimationTemplate(
  obj: TilesetObject
): obj is ObjectAnimationTemplate {
  return obj.type === TilesetObjType.ObjectAnimationTemplate;
}
