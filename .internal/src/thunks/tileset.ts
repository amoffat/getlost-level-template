import { buildSignatureIndex } from "@/editor/tileset/autotile";
import { setCanvasTileset } from "@/editor/tileset/loader";
import { globals as g } from "@/globals";
import { loadTileset, loadTilesets } from "@/persist/tileset/api";
import {
  TilesetEditorState,
  actions as tsActions,
} from "@/slices/tilesetEditor";
import { actions as uiActions } from "@/slices/ui";
import { Tileset } from "@/types/tileset";
import { getImageDataFromBitmap, subImageData } from "@/utils/image";
import { createAsyncThunk } from "@reduxjs/toolkit";

export const selectTilesetThunk = createAsyncThunk(
  "tilesetEditor/selectTilesetThunk",
  async (ts: Tileset | null, { dispatch, getState }) => {
    const state = getState() as { tilesetEditor: TilesetEditorState };

    if (ts?.id === state.tilesetEditor.activeTilesetId) {
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
  async (_, { dispatch, getState }) => {
    const state = getState() as { tilesetEditor: TilesetEditorState };

    const tilesetIds = await loadTilesets();
    for (const tsId of tilesetIds) {
      if (state.tilesetEditor.tilesetIds.includes(tsId)) {
        // Already loaded
        continue;
      }

      const ts = await loadTileset(tsId);
      dispatch(tsActions.addTileset({ tsId, ts }));

      // Start edge signature indexing
      const bitmap = await createImageBitmap(
        await fetch(ts.objectUrl).then((r) => r.blob())
      );
      const imageData = getImageDataFromBitmap(bitmap);

      const objs = new Map<string, ImageData>();
      for (const obj of Object.values(ts.palette)) {
        const cropped = subImageData(imageData, obj.pos);
        objs.set(obj.id, cropped);
      }
      const sigs = buildSignatureIndex(objs);
      g.tilesetEdgeSigs.set(ts.id, sigs);
      // End edge signature indexing

      for (const obj of Object.values(ts.palette)) {
        if (obj.tags.length > 0) {
          dispatch(uiActions.addTilesetGroupTags(obj.tags));
        }
      }
    }
  }
);

export const removeTilesetThunk = createAsyncThunk(
  "tilesetEditor/removeTilesetThunk",
  async (tsId: string, { dispatch, getState }) => {
    const state = getState() as { tilesetEditor: TilesetEditorState };
    const ts = state.tilesetEditor.tilesets[tsId];
    if (!ts) return;

    dispatch(tsActions.removeTileset(tsId));

    // If it's the active tileset, clear the canvas
    if (state.tilesetEditor.activeTilesetId === tsId) {
      await setCanvasTileset(null);
      dispatch(tsActions.setActiveTileset(null));
    }
  }
);
