import { createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Rect } from "../types/rect";
import { Tileset } from "../types/tileset";
import { Pan, Zoom, ZoomPan } from "../types/zoompan";

type Mode = null | "pan" | "group";
export interface TilesetEditorState {
  grid: {
    size: number;
    visible: boolean;
  };
  activeTileset: Tileset | null;
  activeZoomPan: ZoomPan;
  tilesetIds: string[];
  tilesets: Record<string, Tileset>;
  mode: Mode;
  scanPos: Rect | null;
  tilesetZoomPans: Record<string, ZoomPan>;
}

const slice = createSlice({
  name: "tilesetEditor",
  initialState: {
    grid: {
      size: 16,
      visible: true,
    },
    activeTileset: null,
    activeZoomPan: { zoom: 1, pan: { x: 0, y: 0 } },
    tilesetIds: [],
    tilesets: {},
    mode: null,
    scanPos: null,
    tilesetZoomPans: {},
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
      const ts = action.payload;
      state.activeTileset = ts;
      state.activeZoomPan = state.tilesetZoomPans[ts.id];
    },
    addTileset: (state, action: PayloadAction<Tileset>) => {
      const ts = action.payload;
      state.tilesets[ts.id] = ts;
      state.tilesetZoomPans[ts.id] ??= { zoom: 1, pan: { x: 0, y: 0 } };
      if (!state.tilesetIds.includes(ts.id)) {
        state.tilesetIds.push(ts.id);
      }
    },
    setScanPos: (state, action: PayloadAction<Rect | null>) => {
      state.scanPos = action.payload;
    },
    setZoom: (state, action: PayloadAction<Zoom>) => {
      const zoom = action.payload;
      const tsId = state.activeTileset?.id;
      if (!tsId) return;
      state.tilesetZoomPans[tsId].zoom = zoom;
    },
    setPan: (state, action: PayloadAction<Pan>) => {
      const pan = action.payload;
      const tsId = state.activeTileset?.id;
      if (!tsId) return;
      state.tilesetZoomPans[tsId].pan = pan;
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
