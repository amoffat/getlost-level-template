import type { TilesetDocV27 } from "../schema";

/**
 * Migration from version 27 to 28:
 * Widens the tileset's `gridSize` from a single `number` (square tiles) to a
 * `Vector2` (`{ x, y }`), enabling non-uniform width×height tile slicing. Any
 * legacy numeric value is expanded to an equal-axis `{ x: n, y: n }`. Docs that
 * already carry a Vector2 (e.g. created after this change, or backfilled by the
 * 12→13 migration) are left untouched.
 */
export async function migrate(doc: TilesetDocV27) {
  const gridSize = doc.tileset.gridSize as unknown;
  if (typeof gridSize === "number") {
    doc.tileset.gridSize = { x: gridSize, y: gridSize };
  }
}
