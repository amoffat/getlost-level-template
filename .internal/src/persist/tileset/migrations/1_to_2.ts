import type { TileGroup } from "@/types/tilegroup";
import type { TilesetDocV1 } from "../schema";

export function migrate(doc: TilesetDocV1) {
  const ts = doc.tileset as any;
  for (const obj of Object.values(ts.palette)) {
    const tg = obj as TileGroup;
    tg.zIndices = [];
    tg.tags = [];
    tg.name = "";
  }
}
