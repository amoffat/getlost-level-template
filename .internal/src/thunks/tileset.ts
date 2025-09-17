import { setCanvasTileset } from "@/editor/tileset/loader";
import { loadTileset, loadTilesets } from "@/persist/api";
import { createAsyncThunk } from "@reduxjs/toolkit";
import {
  TilesetEditorState,
  actions as tsActions,
} from "../slices/tilesetEditor";
import { Tileset } from "../types/tileset";

export const selectTilesetThunk = createAsyncThunk(
  "tilesetEditor/selectTilesetThunk",
  async (ts: Tileset, { dispatch, getState }) => {
    const state = getState() as { tilesetEditor: TilesetEditorState };

    if (ts.id === state.tilesetEditor.activeTilesetId) {
      // Already active
      return true;
    }

    // Add it to pixi.js
    await setCanvasTileset(ts);
    // Set it as active, which loads its zoom/pan state
    dispatch(tsActions.setActiveTileset(ts));
  }
);

export const loadTilesetsThunk = createAsyncThunk(
  "tilesetEditor/loadTilesetsThunk",
  async (_, { dispatch }) => {
    const tilesetIds = await loadTilesets();
    for (const tsId of tilesetIds) {
      const ts = await loadTileset(tsId);
      dispatch(tsActions.addTileset({ tsId, ts }));
    }
  }
);
