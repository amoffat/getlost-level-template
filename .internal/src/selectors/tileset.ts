import { RootState } from "../store";
import { TileGroup } from "../types/tilegroup";

export function activeTilesetGroups(state: RootState): TileGroup[] {
  const tileset = state.tilesetEditor.activeTileset;
  if (!tileset) return [];
  return state.mapEditor.paletteIds
    .map((id) => state.mapEditor.palette[id])
    .filter((g) => g.objectUrl === tileset.objectUrl);
}
