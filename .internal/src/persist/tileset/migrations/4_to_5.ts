import type { TilesetDocV4 } from "../schema";

export function migrate(doc: TilesetDocV4) {
  // Clean up strange 0-sized tiles
  doc.tileset.paletteIds = doc.tileset.paletteIds.filter((id) => {
    const tile = doc.tileset.palette[id];
    if (!tile) return false;

    const width = tile.pos.br.x - tile.pos.ul.x;
    const height = tile.pos.br.y - tile.pos.ul.y;
    if (width <= 0 || height <= 0) {
      delete doc.tileset.palette[id];
      return false;
    }
    return true;
  });
}
