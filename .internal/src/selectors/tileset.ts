import { RootState } from "../store/store";
import { TileGroup } from "../types/tilegroup";

export function activeTilesetGroups(state: RootState): TileGroup[] {
  const tsId = state.tilesetEditor.activeTilesetId;
  if (!tsId) return [];
  const tileset = state.tilesetEditor.tilesets[tsId];
  return tileset.paletteIds.map((id) => tileset.palette[id]);
}
