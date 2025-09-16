import { createAsyncThunk } from "@reduxjs/toolkit";
import { unpackTileset } from "../editor/tileset/loader";
import {
  TilesetEditorState,
  actions as tsActions,
} from "../slices/tilesetEditor";
import { Tileset } from "../types/tileset";

export const addTilesetThunk = createAsyncThunk(
  "tilesetEditor/addTilesetThunk",
  async (ts: Tileset, { dispatch, getState }) => {
    const state = getState() as { tilesetEditor: TilesetEditorState };
    const extractTiles = !state.tilesetEditor.tilesetIds.includes(ts.id);

    dispatch(tsActions.addTileset(ts));
    dispatch(tsActions.setActiveTileset(ts));
    await unpackTileset({ ts, extractTiles });
  }
);
