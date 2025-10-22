import { TileGroup } from "@/types/tilegroup";
import { oklabHilbertIndex } from "@/utils/hilbert";
import type { TilesetDocV6 } from "../schema";

/**
 * Populate hilbert index for each tile
 * @param doc
 */
export async function migrate(doc: TilesetDocV6) {
  const ts = doc.tileset as any;
  for (const obj of Object.values(ts.tiles.entities)) {
    const tg = obj as TileGroup;
    tg.hilbertIndex = oklabHilbertIndex(tg.avgColor);
  }
}
