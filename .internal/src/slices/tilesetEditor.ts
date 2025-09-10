import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { GroupCoords } from "../types/tilegroup";

type Mode = null | "pan" | "group";

interface TilesetEditorState {
  grid: {
    size: number;
    visible: boolean;
  };
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
      state.groups.push(action.payload);
    },
    clearGroups(state) {
      state.groups = [];
    },
  },
});

export const actions = slice.actions;
export default slice.reducer;
