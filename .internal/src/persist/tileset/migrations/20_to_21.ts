import { isAnimationTemplate } from "@/types/animation";
import type { TemplateObject } from "@/types/tilesetobject";
import type { TilesetDocV20 } from "../schema";

/**
 * Migration from version 20 to 21:
 * Converts AnimationTemplate frame `tg` from a TileGroupTemplate object to its string ID.
 */
export async function migrate(doc: TilesetDocV20) {
  const tiles = doc.tileset.tiles;

  if (tiles && tiles.entities) {
    for (const tile of Object.values(tiles.entities)) {
      if (tile && isAnimationTemplate(tile as TemplateObject)) {
        const anim = tile as any;

        if (Array.isArray(anim.frames)) {
          for (const frame of anim.frames) {
            if (frame.tg !== null && typeof frame.tg === "object") {
              frame.tg = frame.tg.id;
            }
          }
        }
      }
    }
  }
}
