import { createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Tileset } from "../types/tileset";

type Mode = null | "pan" | "group";

interface TilesetEditorState {
  grid: {
    size: number;
    visible: boolean;
  };
  activeTileset: Tileset | null;
  tilesetIds: string[];
  tilesets: Record<string, Tileset>;
  mode: Mode;
}

const slice = createSlice({
  name: "tilesetEditor",
  initialState: {
    grid: {
      size: 16,
      visible: true,
    },
    activeTileset: null,
    tilesetIds: [],
    tilesets: {},
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
    setActiveTileset: (state, action: PayloadAction<Tileset>) => {
      state.activeTileset = action.payload;
    },
    addTileset: (state, action: PayloadAction<Tileset>) => {
      const ts = action.payload;
      state.tilesets[ts.id] = ts;
      state.tilesetIds = state.tilesetIds.filter((id) => id !== ts.id);
      state.tilesetIds.push(ts.id);
    },
  },
  selectors: {
    selectTilesets: createSelector.withTypes<TilesetEditorState>()(
      [(state) => state.tilesetIds, (state) => state.tilesets],
      (tilesetIds, tilesets): Tileset[] => tilesetIds.map((id) => tilesets[id])
    ),
  },
});

export const selectors = slice.selectors;
export const actions = slice.actions;
export default slice.reducer;
