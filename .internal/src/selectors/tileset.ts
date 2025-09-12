import { RootState } from "../store";

export function activeTilesetGroups(state: RootState) {
  const tileset = state.tilesetEditor.tileset;
  if (!tileset) return [];
  return state.mapEditor.palette.filter((g) => g.objectUrl === tileset);
}
