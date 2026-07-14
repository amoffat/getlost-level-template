import { defaultTileSize } from "@/constants";
import type { TilesetDocV12 } from "../schema";

export async function migrate(doc: TilesetDocV12) {
  // `gridSize` is widened to a Vector2 in a later migration (27→28); backfill a
  // square default here so the value is already the modern shape.
  doc.tileset.gridSize = { x: defaultTileSize, y: defaultTileSize };
}
