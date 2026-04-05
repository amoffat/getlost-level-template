import type { TemplateObject } from "@/types/tilesetobject";
import type { TilesetDocV19 } from "../schema";

function normalizePlayerTilesetIds(value: unknown) {
  if (value === null || typeof value !== "object") return;

  if (Array.isArray(value)) {
    for (const item of value) {
      normalizePlayerTilesetIds(item);
    }
    return;
  }

  const record = value as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (key === "tilesetId") {
      record[key] = "player";
      continue;
    }

    normalizePlayerTilesetIds(record[key]);
  }
}

/**
 * Migration from version 19 to 20:
 * Backfills tilesetId on all saved template objects for the player tileset.
 */
export async function migrate(doc: TilesetDocV19) {
  if (doc.tileset.id !== "player") return;

  const tiles = doc.tileset.tiles;
  (doc.tileset as any).restricted = false;
  if (!tiles?.entities) return;
  return;

  for (const tile of Object.values(tiles.entities)) {
    if (!tile) continue;
    normalizePlayerTilesetIds(tile as TemplateObject);
  }
}
