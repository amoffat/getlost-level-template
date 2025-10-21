import type { TileGroup } from "@/types/tilegroup";
import type { TilesetDocV3 } from "../schema";

export function migrate(doc: TilesetDocV3) {
  const ts = doc.tileset as any;
  for (const obj of Object.values(ts.palette)) {
    const tg = obj as TileGroup;
    if (tg.pinned === undefined) {
      tg.pinned = false;
    }
  }
}
