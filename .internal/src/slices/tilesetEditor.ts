import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { TileGroup } from "../types/tilegroup";

type Mode = null | "pan" | "group";

interface TilesetEditorState {
  grid: {
    size: number;
    visible: boolean;
  };
  tileset: string | null;
  mode: Mode;
  groups: TileGroup[];
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
    addGroup(state, action: PayloadAction<TileGroup>) {
      const group = action.payload;
      const newGroups: TileGroup[] = [];

      for (const existing of state.groups) {
        const isOverlapping = !(
          group.pos.br.x <= existing.pos.ul.x ||
          group.pos.ul.x >= existing.pos.br.x ||
          group.pos.br.y <= existing.pos.ul.y ||
          group.pos.ul.y >= existing.pos.br.y
        );
        if (!isOverlapping) {
          newGroups.push(existing);
        }
      }

      if (!group.singleTile) {
        newGroups.push(group);
      }
      state.groups = newGroups;
    },
    addSingleTileGroup(state, action: PayloadAction<TileGroup>) {
      const group = action.payload;
      state.groups.push(group);
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
