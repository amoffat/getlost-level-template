import type { ObjectAnimation } from "./tilegroup";
import type { TilesetObject } from "./tilesetobject";

export type NpcRequiredAnimation =
  | "Idle"
  | "WalkUp"
  | "WalkDown"
  | "WalkLeft"
  | "WalkRight";

export type NpcAnimationRecord = Record<NpcRequiredAnimation, ObjectAnimation> &
  Record<string, ObjectAnimation>;

export interface Npc {
  // A random id
  id: string;
  tilesetId: string;
  tags: string[];
  name: string;
  animations: NpcAnimationRecord;
}

export function isNpc(obj: TilesetObject): obj is Npc {
  return (obj as Npc).animations !== undefined;
}
