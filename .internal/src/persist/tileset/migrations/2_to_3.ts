import type { TileGroup } from "@/types/tilegroup";
import type { TilesetDocV2 } from "../schema";

export function migrate(doc: TilesetDocV2) {
  const ts = doc.tileset as any;
  for (const obj of Object.values(ts.palette)) {
    const tg = obj as TileGroup;
    if (!tg.tags) {
      tg.tags = [];
    }
  }
}
