import { computeEdgeSignatures } from "@/editor/map/utils/autotile";
import {
  generateGridAlignedCoords,
  setCanvasTileset,
  unpackTileset,
} from "@/editor/tileset/loader";
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
import { isTileGroupTemplate, TileGroupTemplate } from "@/types/tilegroup";
import { Mode, Tileset } from "@/types/tileset";
import { schedulerYield } from "@/utils/async";
import { hasSolidEdges, subImageData } from "@/utils/image";
import { genTilesetId, loadTilesetImage } from "@/utils/tileset";
import { notifications } from "@mantine/notifications";
import { createAsyncThunk } from "@reduxjs/toolkit";

export const selectTilesetThunk = createAsyncThunk(
  "tilesetEditor/selectTilesetThunk",
  async (ts: Tileset | null, { dispatch, getState }) => {
    const state = getState() as { tilesetEditor: TilesetEditorState };

    if (ts?.id === state.tilesetEditor.activeTilesetId) {
      // Already active
      return true;
    }

    dispatch(tsActions.clearSelection());

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
  async (objectUrl: string, { dispatch }): Promise<Tileset> => {
    const tsId = await genTilesetId(objectUrl);
    const ts: Tileset = {
      id: tsId,
      objectUrl,
      saved: false,
      tiles: { ids: [], entities: {} },
    };
    await saveTileset(ts);
    await dispatch(loadTilesetThunk(tsId)).unwrap();
    await router.navigate(`/tilesets/${tsId}`);
    return ts;
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
    await loadTilesetImage(ts);
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
      if (!isTileGroupTemplate(obj)) continue;

      // Don't need to compute edges for non-solid tiles
      if (hasSolidEdges(imageData, obj.pos)) {
        const cropped = subImageData(imageData, obj.pos);
        objs.set(obj.id, cropped);
      }
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
      if (isTileGroupTemplate(obj) && obj.tags.length > 0) {
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
      .filter(isTileGroupTemplate)
      .filter((obj) => !obj.pinned)
      .map((obj) => obj.id);
    dispatch(tsActions.deletePaletteObjects({ tsId, ids }));

    const gridSize = state.tilesetEditor.grid.size;
    const coords = generateGridAlignedCoords(tsId, gridSize);
    await unpackTileset(tsId, coords);
  }
);

export const setToolThunk = createAsyncThunk(
  "mapEditor/setToolThunk",
  async (tool: Mode | null, { dispatch }) => {
    if (tool === null) {
      dispatch(tsActions.setMode("select"));
    } else {
      dispatch(tsActions.pushMode(tool));
    }

    dispatch(tsActions.clearCandAnimFrames());
    dispatch(tsActions.clearSelection());
    dispatch(tsActions.setActiveTool(tool));
  }
);

/**
 * Ensures that the candidate animation frame is the same size as the previous
 * animation frame. Otherwise shows an error.
 */
export const addAnimationFrameThunk = createAsyncThunk(
  "tilesetEditor/addAnimationFrameThunk",
  async (tg: TileGroupTemplate, { dispatch, getState }) => {
    const state = getState() as { tilesetEditor: TilesetEditorState };

    const curFrames = state.tilesetEditor.candAnimFrames;
    if (curFrames.length > 0) {
      const firstFrame = curFrames[0];
      const firstWidth = firstFrame.pos.br.x - firstFrame.pos.ul.x;
      const firstHeight = firstFrame.pos.br.y - firstFrame.pos.ul.y;
      const newWidth = tg.pos.br.x - tg.pos.ul.x;
      const newHeight = tg.pos.br.y - tg.pos.ul.y;

      if (firstWidth !== newWidth || firstHeight !== newHeight) {
        notifications.show({
          title: "Animation frame size mismatch",
          message: `The new frame is ${newWidth}x${newHeight}, but the first frame is ${firstWidth}x${firstHeight}. All frames must be the same size.`,
          color: "red",
        });
        return;
      }
    }

    dispatch(tsActions.addCandAnimFrame(tg));
    store.dispatch(tsActions.addOneSelected(tg));
  }
);

export const clearCandAnimFramesThunk = createAsyncThunk(
  "tilesetEditor/clearCandAnimFramesThunk",
  async (_, { dispatch }) => {
    dispatch(tsActions.clearCandAnimFrames());
    dispatch(tsActions.clearSelection());
  }
);
