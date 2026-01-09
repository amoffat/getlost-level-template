import type { AnimationTemplate } from "./animation";
import type { NpcTemplate } from "./npc";
import type { TileGroupTemplate } from "./tilegroup";

export type TemplateObject =
  | TileGroupTemplate
  | AnimationTemplate
  | NpcTemplate;

export interface TsObjCounts {
  objects: number;
  animations: number;
  npcs: number;
}
