import { Mode, NpcSpritesheet } from "@/types/npc";
import { Pan, Zoom, ZoomPan } from "@/types/zoompan";
import { createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface NpcEditorState {
  grid: {
    size: number;
    visible: boolean;
  };
  activeTilesetId: string | null;
  activeZoomPan: ZoomPan;
  tilesetIds: string[];
  tilesets: Record<string, NpcSpritesheet>;
  modeStack: Mode[];
  tilesetZoomPans: Record<string, ZoomPan>;
  loadingPalette: boolean;
}

export const slice = createSlice({
  name: "npcEditor",
  initialState: {
    grid: {
      size: 16,
      visible: true,
    },
    activeTilesetId: null,
    activeZoomPan: { zoom: 1, pan: { x: 0, y: 0 } },
    tilesetIds: [],
    tilesets: {},
    modeStack: [],
    scanPos: null,
    tilesetZoomPans: {},
    loadingPalette: false,
  } as NpcEditorState,
  reducers: {
    setGridVisible(state, action: PayloadAction<boolean>) {
      state.grid.visible = action.payload;
    },
    setGridSize(state, action: PayloadAction<number>) {
      state.grid.size = action.payload;
    },
    pushMode(state, action: PayloadAction<Mode>) {
      if (state.modeStack.at(-1) === action.payload) return;
      state.modeStack.push(action.payload);
    },
    popMode(state) {
      state.modeStack.pop();
    },

    setMode(state, action: PayloadAction<Mode>) {
      state.modeStack = [action.payload];
    },
    setActiveTileset: (state, action: PayloadAction<NpcSpritesheet>) => {
      const ts = action.payload;
      state.activeTilesetId = ts.id;
      state.activeZoomPan = state.tilesetZoomPans[ts.id];
    },
    // addTileset: (
    //   state,
    //   action: PayloadAction<{
    //     tsId: string;
    //     ts: Tileset;
    //   }>
    // ) => {
    //   const { ts } = action.payload;
    //   state.tilesets[ts.id] = ts;
    //   state.tilesetZoomPans[ts.id] ??= { zoom: 1, pan: { x: 0, y: 0 } };
    //   if (!state.tilesetIds.includes(ts.id)) {
    //     state.tilesetIds.push(ts.id);
    //   }
    // },
    setZoom: (state, action: PayloadAction<Zoom>) => {
      const zoom = action.payload;
      const tsId = state.activeTilesetId;
      if (!tsId) return;
      state.tilesetZoomPans[tsId].zoom = zoom;
    },
    setPan: (state, action: PayloadAction<Pan>) => {
      const pan = action.payload;
      const tsId = state.activeTilesetId;
      if (!tsId) return;
      state.tilesetZoomPans[tsId].pan = pan;
    },
    loadingPalette(state, action: PayloadAction<boolean>) {
      state.loadingPalette = action.payload;
    },

    markSaved(state, action: PayloadAction<{ tsId: string; saved: boolean }>) {
      const { tsId, saved } = action.payload;
      const ts = state.tilesets[tsId];
      if (ts) {
        ts.saved = saved;
      }
    },
  },
  selectors: {
    selectNPCs: createSelector.withTypes<NpcEditorState>()(
      [(state) => state.tilesetIds, (state) => state.tilesets],
      (tilesetIds, tilesets): NpcSpritesheet[] =>
        tilesetIds.map((id) => tilesets[id])
    ),
    activeTileset: createSelector.withTypes<NpcEditorState>()(
      [(state) => state.activeTilesetId, (state) => state.tilesets],
      (tsId, tilesets): NpcSpritesheet | null =>
        tsId ? (tilesets[tsId] ?? null) : null
    ),
    selectMode: createSelector.withTypes<NpcEditorState>()(
      [(state) => state.modeStack],
      (modeStack): Mode | null => modeStack.at(-1) ?? null
    ),
  },
});

export const selectors = slice.selectors;
export const actions = slice.actions;
