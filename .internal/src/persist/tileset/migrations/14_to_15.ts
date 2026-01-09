import { isTileGroupTemplate } from "@/types/tilegroup";
import type { TemplateObject } from "@/types/tilesetobject";
import type { TilesetDocV14 } from "../schema";

/**
 * Migration from version 14 to 15:
 * Converts collisionMask from Uint8Array | null to string | null (UUID).
 * Moves the actual Uint8Array data into the doc's maskData Map.
 */
export async function migrate(doc: TilesetDocV14) {
  // Iterate through all tiles in the tileset
  const tiles = doc.tileset.tiles;
  (doc as any).maskData = new Map<string, Uint8Array>();

  if (tiles && tiles.entities) {
    for (const tile of Object.values(tiles.entities)) {
      // Only apply to TileGroupTemplate objects
      if (tile && isTileGroupTemplate(tile as TemplateObject)) {
        const tileGroup = tile as any; // Cast to access properties during migration
        // If the tile has collision mask data (Uint8Array), migrate it
        if (tileGroup.collisionMask) {
          // Generate a UUID for this mask
          const uuid = crypto.randomUUID();

          // Store the Uint8Array data in the maskData Map
          (doc as any).maskData.set(
            uuid,
            tileGroup.collisionMask as unknown as Uint8Array
          );

          // Replace the Uint8Array with the UUID string
          tileGroup.collisionMask = uuid;
        }
      }
    }
  }
}
