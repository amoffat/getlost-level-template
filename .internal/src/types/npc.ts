import { Vector2 } from "@/vec";
import type { AnimationTemplate } from "./animation";
import { NpcProps } from "./properties";
import { TemplateType } from "./templates";
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

export interface NpcTemplate extends NpcProps {
  // A random id
  id: string;
  type: TemplateType.Npc;
  tilesetId: string;
  // The grid size this object is aligned to
  gridSize: Vector2;
  animations: NpcAnimationRecord;
}

export function isNpcTemplate(obj: TilesetObjectTemplate): obj is NpcTemplate {
  return obj.type === TemplateType.Npc;
}
