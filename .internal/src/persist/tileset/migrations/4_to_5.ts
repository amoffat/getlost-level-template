import type { TilesetDocV4 } from "../schema";

export function migrate(doc: TilesetDocV4) {
  const ts = doc.tileset as any;
  // Clean up strange 0-sized tiles
  ts.paletteIds = ts.paletteIds.filter((id: string) => {
    const tile = ts.palette[id];
    if (!tile) return false;

    const width = tile.pos.br.x - tile.pos.ul.x;
    const height = tile.pos.br.y - tile.pos.ul.y;
    if (width <= 0 || height <= 0) {
      delete ts.palette[id];
      return false;
    }
    return true;
  });
}
