import { computeEdgeSignatures } from "@/editor/map/utils/autotile";
import { setCanvasTileset, unpackTileset } from "@/editor/tileset/loader";
import { globals as g } from "@/globals";
import { log } from "@/log";
import { loadTileset, loadTilesets, saveTileset } from "@/persist/tileset/api";
import { router } from "@/router";
import {
  TilesetEditorState,
  actions as tsActions,
} from "@/slices/tilesetEditor";
import { actions as uiActions } from "@/slices/ui";
import { store } from "@/store/store";
import { Tileset } from "@/types/tileset";
import { schedulerYield } from "@/utils/async";
import { hasSolidEdges, subImageData } from "@/utils/image";
import { genTilesetId, loadTilesetImage } from "@/utils/tileset";
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
    dispatch(uiActions.pushLoadingMessage("Loading tilesets ids..."));
    const tilesetIds = await loadTilesets();
    for (const tsId of tilesetIds) {
      await dispatch(loadTilesetThunk(tsId)).unwrap();
    }
    dispatch(uiActions.popLoadingMessage());
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
    await saveTileset(ts);
    await dispatch(loadTilesetThunk(tsId)).unwrap();
    await router.navigate(`/tilesets/${tsId}`);
  }
);

// New thunk that loads a single tileset and performs all related side effects
export const loadTilesetThunk = createAsyncThunk(
  "tilesetEditor/loadTilesetThunk",
  async (tsId: string, { dispatch }) => {
    dispatch(uiActions.pushLoadingMessage(`Loading tileset ${tsId}...`));
    const ts = await loadTileset(tsId);
    dispatch(tsActions.addTileset({ tsId, ts }));

    // Preload its texture
    await loadTilesetImage(tsId, ts.objectUrl);
    await dispatch(loadEdgeSignaturesThunk(tsId)).unwrap();
    await dispatch(populateTilesetTagsThunk(tsId)).unwrap();

    dispatch(uiActions.popLoadingMessage());

    return true;
  }
);

export const loadEdgeSignaturesThunk = createAsyncThunk(
  "tilesetEditor/loadEdgeSignaturesThunk",
  async (tsId: string, { getState, dispatch }) => {
    const state = getState() as { tilesetEditor: TilesetEditorState };
    const ts = state.tilesetEditor.tilesets[tsId];
    if (!ts) {
      log.error(`loadEdgeSignaturesThunk: tileset ${tsId} not found`);
      return;
    }

    dispatch(
      uiActions.pushLoadingMessage(`Indexing edges for tileset ${tsId}...`)
    );

    const imageData = g.tilesetImageDataCache.get(tsId)!;
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

    let count = 0;
    for (const [id, img] of objs.entries()) {
      g.tileEdgeSigs.set(id, computeEdgeSignatures(img));
      count++;
      // Schedule yields to avoid blocking the main thread too long. This
      // ensures that our ui loading messages update properly.
      if (count % 10 === 0) {
        await schedulerYield();
      }
    }

    dispatch(uiActions.popLoadingMessage());
  }
);

export const populateTilesetTagsThunk = createAsyncThunk(
  "tilesetEditor/populateTilesetTagsThunk",
  async (tsId: string, { dispatch, getState }) => {
    const state = getState() as { tilesetEditor: TilesetEditorState };
    const ts = state.tilesetEditor.tilesets[tsId];
    if (!ts) {
      log.error(`populateTilesetTagsThunk: tileset ${tsId} not found`);
      return;
    }

    for (const obj of Object.values(ts.tiles.entities)) {
      if (obj.tags.length > 0) {
        dispatch(uiActions.addTilesetGroupTags(obj.tags));
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

    // If it's the active tileset, clear the canvas
    if (state.tilesetEditor.activeTilesetId === tsId) {
      await setCanvasTileset(null);
      dispatch(tsActions.setActiveTileset(null));
    }

    dispatch(tsActions.removeTileset(tsId));
    await router.navigate("/tilesets");
  }
);

export const retileThunk = createAsyncThunk(
  "tilesetEditor/retileThunk",
  async (tsId: string, { dispatch }) => {
    const state = store.getState();
    const ts = state.tilesetEditor.tilesets[tsId];
    if (!ts) {
      log.error(`retileThunk: tileset ${tsId} not found`);
      return;
    }

    const ids = Object.values(ts.tiles.entities)
      .filter((obj) => !obj.pinned)
      .map((obj) => obj.id);
    dispatch(tsActions.deletePaletteObjects({ tsId, ids }));
    await unpackTileset(tsId);
  }
);
