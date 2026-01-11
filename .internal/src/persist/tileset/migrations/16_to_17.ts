import { isTileGroupTemplate } from "@/types/tilegroup";
import type { TemplateObject } from "@/types/tilesetobject";
import type { TilesetDocV16 } from "../schema";

/**
 * Migration from version 16 to 17:
 * Removes TileGroupTemplate.collisions.coverage
 * Adds TileGroupTemplate.collisions.simplify (default 1.0) only if mask is not null
 */
export async function migrate(doc: TilesetDocV16) {
  // Iterate through all tiles in the tileset
  const tiles = doc.tileset.tiles;

  if (tiles && tiles.entities) {
    for (const tile of Object.values(tiles.entities)) {
      // Only apply to TileGroupTemplate objects
      if (tile && isTileGroupTemplate(tile as TemplateObject)) {
        const tileGroup = tile as any; // Cast to access properties during migration

        // If collisions object exists
        if (tileGroup.collisions) {
          // Remove coverage property if it exists
          if (tileGroup.collisions.coverage !== undefined) {
            delete tileGroup.collisions.coverage;
          }

          // Add simplify property only if mask is not null
          if (tileGroup.collisions.simplify === undefined) {
            tileGroup.collisions.simplify = 1.0;
          }
        }
      }
    }
  }
}
