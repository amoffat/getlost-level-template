import { isTileGroupTemplate } from "@/types/tilegroup";
import type { TemplateObject } from "@/types/tilesetobject";
import type { TilesetDocV13 } from "../schema";

export async function migrate(doc: TilesetDocV13) {
  // Iterate through all tiles in the tileset
  const tiles = doc.tileset.tiles;

  if (tiles && tiles.entities) {
    for (const tile of Object.values(tiles.entities)) {
      // Only apply to TileGroupTemplate objects
      if (tile && isTileGroupTemplate(tile as TemplateObject)) {
        const tileGroup = tile as any; // Cast to access properties during migration
        // Add collisionMask if not defined (empty Uint8Array)
        if (!tileGroup.collisionMask) {
          tileGroup.collisionMask = null;
        }

        // Add collisionShapes if not defined (empty array)
        if (!tileGroup.collisionShapes) {
          tileGroup.collisionShapes = [];
        }
      }
    }
  }
}
