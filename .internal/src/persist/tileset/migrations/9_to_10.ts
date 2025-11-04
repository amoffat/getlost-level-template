import type { TilesetDocV9 } from "../schema";

/**
 * Migration from version 9 to 10
 * Converts Rect from {ul: Vector, br: Vector} to {x: number, y: number, width: number, height: number}
 */
export async function migrate(doc: TilesetDocV9) {
  const tileset = doc.tileset;

  // Migrate all TileGroupTemplate positions
  if (tileset.tiles && tileset.tiles.entities) {
    for (const obj of Object.values(tileset.tiles.entities)) {
      if (!obj) continue;

      if ("pos" in obj && obj.pos) {
        const oldPos = obj.pos as any;
        if ("ul" in oldPos && "br" in oldPos) {
          obj.pos = {
            x: oldPos.ul.x,
            y: oldPos.ul.y,
            width: oldPos.br.x - oldPos.ul.x,
            height: oldPos.br.y - oldPos.ul.y,
          } as any;
        }
      }

      // Migrate animation frames if present
      if ("frames" in obj && Array.isArray(obj.frames)) {
        for (const frame of obj.frames) {
          if (frame.tg && frame.tg.pos) {
            const oldPos = frame.tg.pos as any;
            if ("ul" in oldPos && "br" in oldPos) {
              frame.tg.pos = {
                x: oldPos.ul.x,
                y: oldPos.ul.y,
                width: oldPos.br.x - oldPos.ul.x,
                height: oldPos.br.y - oldPos.ul.y,
              } as any;
            }
          }
        }
      }
    }
  }
}
