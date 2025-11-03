import { ObjectAnimationTemplate } from "@/types/animation";
import { NpcTemplate } from "@/types/npc";
import { area } from "@/types/rect";
import { TileGroupTemplate } from "@/types/tilegroup";

export function tileGroupSort(
  a: TileGroupTemplate,
  b: TileGroupTemplate
): number {
  const aArea = area(a.pos);
  const bArea = area(b.pos);
  if (aArea !== bArea) return bArea - aArea;

  if (a.tilesetId !== b.tilesetId) {
    return a.tilesetId.localeCompare(b.tilesetId);
  }

  if (a.hilbertIndex !== b.hilbertIndex) {
    return b.hilbertIndex - a.hilbertIndex;
  }

  return a.id.localeCompare(b.id);
}

export function objectAnimationSort(
  a: ObjectAnimationTemplate,
  b: ObjectAnimationTemplate
): number {
  const aTg = a.frames[0]!.tg;
  const bTg = b.frames[0]!.tg;

  const aArea = area(aTg.pos);
  const bArea = area(bTg.pos);
  if (aArea !== bArea) return bArea - aArea;

  if (aTg.tilesetId !== bTg.tilesetId) {
    return aTg.tilesetId.localeCompare(bTg.tilesetId);
  }

  if (aTg.hilbertIndex !== bTg.hilbertIndex) {
    return bTg.hilbertIndex - aTg.hilbertIndex;
  }

  return a.id.localeCompare(b.id);
}

export function npcSort(a: NpcTemplate, b: NpcTemplate): number {
  return a.id.localeCompare(b.id);
}
