import type { ObjectAnimationTemplate } from "./animation";
import type { NpcTemplate } from "./npc";
import type { TileGroupTemplate } from "./tilegroup";

export type TilesetObject =
  | TileGroupTemplate
  | ObjectAnimationTemplate
  | NpcTemplate;

export interface TsObjCounts {
  objects: number;
  animations: number;
  npcs: number;
}
