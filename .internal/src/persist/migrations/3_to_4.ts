import type { TilesetDocV2 } from "../schema";

export function migrate(doc: TilesetDocV2) {
  for (const tile of Object.values(doc.tileset.palette)) {
    if (tile.pinned === undefined) {
      tile.pinned = false;
    }
  }
}
