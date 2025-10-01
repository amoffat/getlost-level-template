import { TileGroup } from "@/types/tilegroup";

export function shouldOutline(g: TileGroup) {
  if (g.pinned) return true;
  return !g.singleTile;
}
