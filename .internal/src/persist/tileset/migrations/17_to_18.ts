import { isTileGroupTemplate } from "@/types/tilegroup";
import type { TemplateObject } from "@/types/tilesetobject";
import type { Vector2 } from "@/vec";
import type { TilesetDocV17 } from "../schema";

/**
 * Migration from version 17 to 18:
 * Converts TileGroupTemplate.zIndices from number[] to Vector2[]
 *
 * Previously, zIndices was an array of numbers (0-1) representing the z-index
 * at fixed intervals (every gridSize.x pixels).
 *
 * Now, zIndices is an array of Vector2 where:
 * - x: normalized position (0-1) across the width of the tilegroup
 * - y: normalized z-index (0-1)
 *
 * The first entry should be at x=0 (far left), the last at x=1 (far right).
 */
export async function migrate(doc: TilesetDocV17) {
  // Iterate through all tiles in the tileset
  const tiles = doc.tileset.tiles;

  if (tiles && tiles.entities) {
    for (const tile of Object.values(tiles.entities)) {
      // Only apply to TileGroupTemplate objects
      if (tile && isTileGroupTemplate(tile as TemplateObject)) {
        const tileGroup = tile as any; // Cast to access properties during migration

        // Convert old number[] zIndices to Vector2[]
        if (tileGroup.zIndices && Array.isArray(tileGroup.zIndices)) {
          const oldZIndices = tileGroup.zIndices as number[];
          const newZIndices: Vector2[] = [];

          // For each old z-index value, create a Vector2 point
          // The x position is calculated based on the index position
          for (let i = 0; i < oldZIndices.length; i++) {
            const normalizedX =
              oldZIndices.length > 1 ? i / (oldZIndices.length - 1) : 0.5; // If only one point, place it at center

            newZIndices.push({
              x: normalizedX,
              y: oldZIndices[i],
            });
          }

          tileGroup.zIndices = newZIndices;
        }
      }
    }
  }
}
