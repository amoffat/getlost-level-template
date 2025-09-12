import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type Mode = null | "pan" | "group";

interface TilesetEditorState {
  grid: {
    size: number;
    visible: boolean;
  };
  tileset: string | null;
  mode: Mode;
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
    setTileset: (state, action: PayloadAction<string | null>) => {
      state.tileset = action.payload;
    },
  },
});

export const actions = slice.actions;
export default slice.reducer;
