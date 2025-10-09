import { globals as gMap } from "@/editor/map/globals";
import { computeEdgeSignatures } from "@/editor/tileset/autotile";
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
import * as P from "pixi.js";

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
  async (_, { dispatch }) => {
    dispatch(uiActions.setLoadingMessage("Loading tilesets ids..."));
    const tilesetIds = await loadTilesets();
    for (const tsId of tilesetIds) {
      await dispatch(loadTilesetThunk(tsId)).unwrap();
    }
  }
);

// New thunk that loads a single tileset and performs all related side effects
export const loadTilesetThunk = createAsyncThunk(
  "tilesetEditor/loadTilesetThunk",
  async (tsId: string, { dispatch, getState }) => {
    const state = getState() as { tilesetEditor: TilesetEditorState };

    if (state.tilesetEditor.tilesetIds.includes(tsId)) {
      // Already loaded
      return true;
    }

    dispatch(uiActions.setLoadingMessage(`Loading tileset ${tsId}...`));
    const ts = await loadTileset(tsId);
    dispatch(tsActions.addTileset({ tsId, ts }));

    if (!gMap.tilesetCache.has(tsId)) {
      const tex = await P.Assets.load<P.Texture>({
        src: ts.objectUrl,
        parser: "loadTextures",
      });
      tex.source.scaleMode = "nearest";
      gMap.tilesetCache.set(tsId, tex);
    }

    // Start edge signature indexing
    dispatch(
      uiActions.setLoadingMessage(`Indexing edges for tileset ${tsId}...`)
    );
    const bitmap = await createImageBitmap(
      await fetch(ts.objectUrl).then((r) => r.blob())
    );
    const imageData = getImageDataFromBitmap(bitmap);

    const objs = new Map<string, ImageData>();
    for (const obj of Object.values(ts.palette)) {
      const cropped = subImageData(imageData, obj.pos);
      objs.set(obj.id, cropped);
      g.tileIdToTileGroup.set(obj.id, obj);
    }
    for (const [id, img] of objs.entries()) {
      g.tileEdgeSigs.set(id, computeEdgeSignatures(img));
    }
    // End edge signature indexing

    for (const obj of Object.values(ts.palette)) {
      if (obj.tags.length > 0) {
        dispatch(uiActions.addTilesetGroupTags(obj.tags));
      }
    }

    return true;
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
