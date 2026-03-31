import { isAnimationTemplate } from "@/types/animation";
import type { TemplateObject } from "@/types/tilesetobject";
import type { TilesetDocV18 } from "../schema";

/**
 * Migration from version 18 to 19:
 * Renames AnimationTemplate.names to AnimationTemplate.slotNames
 */
export async function migrate(doc: TilesetDocV18) {
  const tiles = doc.tileset.tiles;

  if (tiles && tiles.entities) {
    for (const tile of Object.values(tiles.entities)) {
      if (tile && isAnimationTemplate(tile as TemplateObject)) {
        const anim = tile as any;

        if (anim.names !== undefined) {
          anim.slotNames = anim.names;
          delete anim.names;
        }
      }
    }
  }
}
