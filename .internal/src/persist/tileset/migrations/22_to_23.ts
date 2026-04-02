import { isAnimationTemplate } from "@/types/animation";
import { isNpcTemplate } from "@/types/npc";
import { isTileGroupTemplate } from "@/types/tilegroup";
import type { TemplateObject } from "@/types/tilesetobject";
import type { TilesetDocV22 } from "../schema";

/**
 * Migration from version 22 to 23:
 * Reverts migrations 20→21 and 21→22 by converting string IDs back to full objects:
 * - AnimationTemplate frame `tg`: string ID → TileGroupTemplate object
 * - NpcAnimation.animation: string ID → AnimationTemplate object
 */
export async function migrate(doc: TilesetDocV22) {
  const tiles = doc.tileset.tiles;

  if (!tiles?.entities) return;

  const entities = tiles.entities as Record<string, TemplateObject>;

  // First pass: resolve AnimationTemplate frame tg string IDs → TileGroupTemplate objects.
  // This must run before NPC animations are resolved so that the AnimationTemplate
  // objects we embed into NPCs already contain full TileGroupTemplate frames.
  for (const tile of Object.values(entities)) {
    if (tile && isAnimationTemplate(tile)) {
      const anim = tile as any;

      if (Array.isArray(anim.frames)) {
        for (const frame of anim.frames) {
          if (frame.tg !== null && typeof frame.tg === "string") {
            const tg = entities[frame.tg];
            if (tg && isTileGroupTemplate(tg)) {
              frame.tg = tg;
            }
          }
        }
      }
    }
  }

  // Second pass: resolve NpcAnimation.animation string IDs → AnimationTemplate objects.
  for (const tile of Object.values(entities)) {
    if (tile && isNpcTemplate(tile)) {
      const npc = tile as any;

      if (npc.animations && typeof npc.animations === "object") {
        for (const slot of Object.values(npc.animations) as any[]) {
          if (slot.animation !== null && typeof slot.animation === "string") {
            const anim = entities[slot.animation];
            if (anim && isAnimationTemplate(anim)) {
              slot.animation = anim;
            }
          }
        }
      }
    }
  }
}
