import { defaultTileSize } from "@/constants";
import type { TilesetDocV12 } from "../schema";

export async function migrate(doc: TilesetDocV12) {
  doc.tileset.gridSize = defaultTileSize;
}
