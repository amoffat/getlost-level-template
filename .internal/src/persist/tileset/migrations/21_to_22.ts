import { isNpcTemplate } from "@/types/npc";
import type { TemplateObject } from "@/types/tilesetobject";
import type { TilesetDocV21 } from "../schema";

/**
 * Migration from version 21 to 22:
 * Converts NpcAnimation.animation from a full AnimationTemplate object to its string ID.
 */
export async function migrate(doc: TilesetDocV21) {
  const tiles = doc.tileset.tiles;

  if (tiles && tiles.entities) {
    for (const tile of Object.values(tiles.entities)) {
      if (tile && isNpcTemplate(tile as TemplateObject)) {
        const npc = tile as any;

        if (npc.animations && typeof npc.animations === "object") {
          for (const slot of Object.values(npc.animations) as any[]) {
            if (slot.animation !== null && typeof slot.animation === "object") {
              slot.animation = slot.animation.id;
            }
          }
        }
      }
    }
  }
}
