import { TileGroup } from "@/types/tilegroup";
import { tsDependentTileId } from "@/utils/tileset";
import type { TilesetDocV7 } from "../schema";

export async function migrate(doc: TilesetDocV7) {
  const ts = doc.tileset as any;
  for (const obj of Object.values(ts.tiles.entities)) {
    const tg = obj as TileGroup;
    tg.uniqueId = await tsDependentTileId({
      tileId: tg.id,
      tsId: ts.id,
      pos: tg.pos,
    });
  }
}
