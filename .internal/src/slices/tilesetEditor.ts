import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { GroupCoords } from "../types/tilegroup";
import { closeEnough } from "../utils/math";

type Mode = null | "pan" | "group";

interface TilesetEditorState {
  grid: {
    size: number;
    visible: boolean;
  };
  tileset: string | null;
  mode: Mode;
  groups: GroupCoords[];
}

const slice = createSlice({
  name: "tilesetEditor",
  initialState: {
    grid: {
      size: 16,
      visible: true,
    },
    tileset: null,
    mode: null,
    groups: [],
  } as TilesetEditorState,
  reducers: {
    setGridVisible(state, action: PayloadAction<boolean>) {
      state.grid.visible = action.payload;
    },
    setGridSize(state, action: PayloadAction<number>) {
      state.grid.size = action.payload;
    },
    setMode(state, action: PayloadAction<Mode>) {
      state.mode = action.payload;
    },
    addGroup(state, action: PayloadAction<GroupCoords>) {
      const group = action.payload;
      const newGroups: GroupCoords[] = [];

      for (const existing of state.groups) {
        const isOverlapping = !(
          group.br.x <= existing.ul.x ||
          group.ul.x >= existing.br.x ||
          group.br.y <= existing.ul.y ||
          group.ul.y >= existing.br.y
        );
        if (!isOverlapping) {
          newGroups.push(existing);
        }
      }
      const width = group.br.x - group.ul.x;
      const height = group.br.y - group.ul.y;
      const gridSize = state.grid.size;
      const isSingleTile =
        closeEnough(width, gridSize) && closeEnough(height, gridSize);
      if (!isSingleTile) {
        newGroups.push(group);
      }
      state.groups = newGroups;
    },
    clearGroups(state) {
      state.groups = [];
    },
    setTileset: (state, action: PayloadAction<string | null>) => {
      state.tileset = action.payload;
    },
  },
});

export const actions = slice.actions;
export default slice.reducer;
