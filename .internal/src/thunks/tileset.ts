import { computeEdgeSignatures } from "@/editor/map/utils/autotile";
import { setCanvasTileset, unpackActiveTileset } from "@/editor/tileset/loader";
import { globals as g } from "@/globals";
import { loadTileset, loadTilesets } from "@/persist/tileset/api";
import { router } from "@/router";
import {
  TilesetEditorState,
  actions as tsActions,
} from "@/slices/tilesetEditor";
import { actions as uiActions } from "@/slices/ui";
import { store } from "@/store/store";
import { Tileset } from "@/types/tileset";
import {
  getImageDataFromBitmap,
  hasSolidEdges,
  subImageData,
} from "@/utils/image";
import { genTilesetId, loadTilesetTex } from "@/utils/tileset";
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
  async (_, { dispatch }) => {
    dispatch(uiActions.setLoadingMessage("Loading tilesets ids..."));
    const tilesetIds = await loadTilesets();
    for (const tsId of tilesetIds) {
      await dispatch(loadTilesetThunk(tsId)).unwrap();
    }
  }
);

export const uploadTilesetThunk = createAsyncThunk(
  "tilesetEditor/uploadTilesetThunk",
  async (file: File, { dispatch }) => {
    const objectUrl = URL.createObjectURL(file);
    const tsId = await genTilesetId(file);
    const ts: Tileset = {
      id: tsId,
      objectUrl,
      saved: false,
      tiles: { ids: [], entities: {} },
    };

    await loadTilesetTex(tsId, ts.objectUrl);

    dispatch(tsActions.addTileset({ tsId, ts }));
    await dispatch(selectTilesetThunk(ts)).unwrap();
    await unpackActiveTileset();
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

    // Preload its texture
    await loadTilesetTex(tsId, ts.objectUrl);

    // Start edge signature indexing
    dispatch(
      uiActions.setLoadingMessage(`Indexing edges for tileset ${tsId}...`)
    );
    const bitmap = await createImageBitmap(
      await fetch(ts.objectUrl).then((r) => r.blob())
    );
    const imageData = getImageDataFromBitmap(bitmap);
    g.tilesetImageDataCache.set(tsId, imageData);

    const objs = new Map<string, ImageData>();
    for (const obj of Object.values(ts.tiles.entities)) {
      // Skip tiles with transparent edges
      if (!hasSolidEdges(imageData, obj.pos)) {
        continue;
      }

      const cropped = subImageData(imageData, obj.pos);
      objs.set(obj.id, cropped);
      g.tileIdToTileGroup.set(obj.id, obj);
    }
    for (const [id, img] of objs.entries()) {
      g.tileEdgeSigs.set(id, computeEdgeSignatures(img));
    }
    // End edge signature indexing

    for (const obj of Object.values(ts.tiles.entities)) {
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

    // If it's the active tileset, clear the canvas
    if (state.tilesetEditor.activeTilesetId === tsId) {
      await setCanvasTileset(null);
      dispatch(tsActions.setActiveTileset(null));
    }

    dispatch(tsActions.removeTileset(tsId));
    router.navigate("/tilesets");
  }
);

export const retileThunk = createAsyncThunk(
  "tilesetEditor/retileThunk",
  async (tsId: string, { dispatch }) => {
    const state = store.getState();
    const ts = state.tilesetEditor.tilesets[tsId];
    if (!ts) return;

    const ids = Object.values(ts.tiles.entities)
      .filter((obj) => !obj.pinned)
      .map((obj) => obj.id);
    dispatch(tsActions.deletePaletteObjects({ tsId, ids }));
    await unpackActiveTileset();
  }
);
