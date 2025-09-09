import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface TilesetEditorState {
  grid: {
    size: number;
    visible: boolean;
  };
}

const slice = createSlice({
  name: "tilesetEditor",
  initialState: {
    grid: {
      size: 16,
      visible: true,
    },
  } as TilesetEditorState,
  reducers: {
    setGridVisible(state, action: PayloadAction<boolean>) {
      state.grid.visible = action.payload;
    },
    setGridSize(state, action: PayloadAction<number>) {
      state.grid.size = action.payload;
    },
  },
});

export const { setGridVisible, setGridSize } = slice.actions;
export default slice.reducer;
