import type { TilesetDocV3 } from "../schema";

export function migrate(doc: TilesetDocV3) {
  for (const tile of Object.values(doc.tileset.palette)) {
    if (tile.pinned === undefined) {
      tile.pinned = false;
    }
  }
}
