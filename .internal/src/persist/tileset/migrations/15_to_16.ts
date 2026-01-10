import { isTileGroupTemplate } from "@/types/tilegroup";
import type { TemplateObject } from "@/types/tilesetobject";
import type { TilesetDocV15 } from "../schema";

/**
 * Migration from version 15 to 16:
 * Moves TileGroupTemplate.collisionMask to TileGroupTemplate.collisions.mask
 * Moves TileGroupTemplate.collisionShapes to TileGroupTemplate.collisions.shapes
 * Adds TileGroupTemplate.collisions.coverage with default value 1.0
 */
export async function migrate(doc: TilesetDocV15) {
  // Iterate through all tiles in the tileset
  const tiles = doc.tileset.tiles;

  if (tiles && tiles.entities) {
    for (const tile of Object.values(tiles.entities)) {
      // Only apply to TileGroupTemplate objects
      if (tile && isTileGroupTemplate(tile as TemplateObject)) {
        const tileGroup = tile as any; // Cast to access properties during migration

        // Initialize the collisions object if it doesn't exist
        if (!tileGroup.collisions) {
          tileGroup.collisions = {
            mask: null,
            shapes: [],
            coverage: 1.0,
          };
        }

        // Move collisionMask to collisions.mask
        if (tileGroup.collisionMask !== undefined) {
          tileGroup.collisions.mask = tileGroup.collisionMask;
          delete tileGroup.collisionMask;
        }

        // Move collisionShapes to collisions.shapes
        if (tileGroup.collisionShapes !== undefined) {
          tileGroup.collisions.shapes = tileGroup.collisionShapes;
          delete tileGroup.collisionShapes;
        }

        // Ensure collisions.coverage is set (default to 1.0 if not present)
        if (tileGroup.collisions.coverage === undefined) {
          tileGroup.collisions.coverage = 1.0;
        }
      }
    }
  }
}
