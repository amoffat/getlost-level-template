import { isAnimationTemplate } from "@/types/animation";
import { isNpcTemplate } from "@/types/npc";
import type { TemplateObject } from "@/types/tilesetobject";
import type { TilesetDocV26 } from "../schema";

/**
 * Migration from version 26 to 27:
 * Adds the required per-frame `flipX` (horizontal mirror) flag to every
 * animation frame, backfilling `false` for existing data. Frames live both
 * directly on AnimationTemplates and inside each animation of an NpcTemplate.
 */
export async function migrate(doc: TilesetDocV26) {
  const tiles = doc.tileset.tiles;
  if (!tiles?.entities) return;

  const backfill = (frames: unknown) => {
    if (!Array.isArray(frames)) return;
    for (const frame of frames) {
      if (frame && typeof frame === "object") {
        (frame as { flipX?: boolean }).flipX ??= false;
      }
    }
  };

  for (const tile of Object.values(tiles.entities)) {
    if (!tile) continue;
    const obj = tile as TemplateObject;

    if (isAnimationTemplate(obj)) {
      backfill((obj as any).frames);
    } else if (isNpcTemplate(obj)) {
      const npc = obj as any;
      if (npc.animations && typeof npc.animations === "object") {
        for (const slot of Object.values(npc.animations) as any[]) {
          backfill(slot?.animation?.frames);
        }
      }
    }
  }
}
