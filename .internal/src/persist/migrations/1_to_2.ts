import type { TilesetDocV1 } from "../schema";

export function migrate(doc: TilesetDocV1) {
  for (const tile of Object.values(doc.tileset.palette)) {
    tile.zIndices = [];
    tile.tags = [];
    tile.name = "";
  }
}
