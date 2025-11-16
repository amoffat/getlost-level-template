import { Vector2 } from "@/vec";
import type { AnimationTemplate } from "./animation";
import { TilesetObjType } from "./tileset";
import type { TilesetObjectTemplate } from "./tilesetobject";

export type NpcRequiredAnimation =
  | "Idle"
  | "WalkUp"
  | "WalkDown"
  | "WalkLeft"
  | "WalkRight";

export type NpcAnimationRecord = Record<
  NpcRequiredAnimation,
  AnimationTemplate
> &
  Record<string, AnimationTemplate>;

export interface NpcTemplate {
  // A random id
  id: string;
  type: TilesetObjType.NpcTemplate;
  tilesetId: string;
  // The grid size this object is aligned to
  gridSize: Vector2;
  tags: string[];
  name: string;
  animations: NpcAnimationRecord;
}

export function isNpcTemplate(obj: TilesetObjectTemplate): obj is NpcTemplate {
  return obj.type === TilesetObjType.NpcTemplate;
}
