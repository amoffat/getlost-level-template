import { Vector2 } from "@/vec";
import type { AnimationTemplate } from "./animation";
import { NpcProps } from "./properties";
import { TemplateType } from "./templates";
import type { TemplateObject } from "./tilesetobject";

export type NpcRequiredAnimation =
  | "Idle"
  | "WalkUp"
  | "WalkDown"
  | "WalkLeft"
  | "WalkRight";

interface NpcAnimation {
  flipX: boolean;
  animation: AnimationTemplate;
}

export type NpcAnimationRecord = Record<NpcRequiredAnimation, NpcAnimation> &
  Record<string, NpcAnimation>;

export interface NpcTemplate extends NpcProps {
  // A random id
  id: string;
  type: TemplateType.Npc;
  tilesetId: string;
  // The grid size this object is aligned to
  gridSize: Vector2;
  animations: NpcAnimationRecord;
}

export function isNpcTemplate(obj: TemplateObject): obj is NpcTemplate {
  return obj.type === TemplateType.Npc;
}
