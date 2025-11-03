import type { ObjectAnimationTemplate } from "./animation";
import { TilesetObjType } from "./tileset";
import type { TilesetObject } from "./tilesetobject";

export type NpcRequiredAnimation =
  | "Idle"
  | "WalkUp"
  | "WalkDown"
  | "WalkLeft"
  | "WalkRight";

export type NpcAnimationRecord = Record<
  NpcRequiredAnimation,
  ObjectAnimationTemplate
> &
  Record<string, ObjectAnimationTemplate>;

export interface NpcTemplate {
  // A random id
  id: string;
  type: TilesetObjType.NpcTemplate;
  tilesetId: string;
  tags: string[];
  name: string;
  animations: NpcAnimationRecord;
}

export function isNpcTemplate(obj: TilesetObject): obj is NpcTemplate {
  return obj.type === TilesetObjType.NpcTemplate;
}
