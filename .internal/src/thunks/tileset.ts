import { setCanvasTileset, unpackActiveTileset } from "@/editor/tileset/loader";
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

    const needsInit = !state.tilesetEditor.tilesetIds.includes(ts.id);

    // Add it to the state
    dispatch(tsActions.addTileset({ tsId: ts.id, ts }));
    // Add it to pixi.js
    await setCanvasTileset(ts);
    // Set it as active, which loads its zoom/pan state
    dispatch(tsActions.setActiveTileset(ts));
    // Unpack tiles if this is a new tileset
    if (needsInit) {
      await unpackActiveTileset();
    }
  }
);

export const loadTilesetThunk = createAsyncThunk(
  "tilesetEditor/loadTilesetThunk",
  async (_, { dispatch }) => {
    const tilesetIds = await loadTilesets();
    for (const tsId of tilesetIds) {
      const ts = await loadTileset(tsId);
      dispatch(tsActions.addTileset({ tsId, ts }));
    }
  }
);
