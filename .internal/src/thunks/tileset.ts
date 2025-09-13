import { createAsyncThunk } from "@reduxjs/toolkit";
import { loadTileset } from "../editor/tileset/loader";
import {
  TilesetEditorState,
  actions as tsActions,
} from "../slices/tilesetEditor";
import { Tileset } from "../types/tileset";

export const loadTilesetThunk = createAsyncThunk(
  "tilesetEditor/loadTileset",
  async (ts: Tileset, { dispatch, getState }) => {
    const state = getState() as { tilesetEditor: TilesetEditorState };
    const extractTiles = !state.tilesetEditor.tilesetIds.includes(ts.id);

    await loadTileset({ ts, extractTiles });
    dispatch(tsActions.addTileset(ts));
    dispatch(tsActions.setActiveTileset(ts));
  }
);
