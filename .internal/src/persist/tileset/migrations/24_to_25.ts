import { isNpcTemplate } from "@/types/npc";
import type { TemplateObject } from "@/types/tilesetobject";
import type { TilesetDocV24 } from "../schema";

/**
 * Migration from version 24 to 25:
 * Sets `talkable = true` on all NpcTemplates, backfilling the property for
 * existing tileset data.
 */
export async function migrate(doc: TilesetDocV24) {
  const tiles = doc.tileset.tiles;

  if (!tiles?.entities) return;

  for (const tile of Object.values(tiles.entities)) {
    if (tile && isNpcTemplate(tile as TemplateObject)) {
      (tile as any).talkable = true;
    }
  }
}
