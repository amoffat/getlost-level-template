import { defaultTileSize } from "@/constants";
import { computeEdgeSignatures } from "@/editors/map/utils/autotile";
import {
  generateGridAlignedCoords,
  setCanvasTileset,
  unpackTileset,
} from "@/editors/tileset/loader";
import { globals as gApp } from "@/globals";
import { log } from "@/log";
import { loadTileset, loadTilesets, saveTileset } from "@/persist/tileset/api";
import { router } from "@/router";
import { brokenTileGroups } from "@/selectors/map";
import { actions as mapActions } from "@/slices/mapEditor";
import {
  TilesetEditorState,
  actions as tsActions,
} from "@/slices/tilesetEditor";
import { actions as uiActions } from "@/slices/ui";
import { RootState, store } from "@/store/store";
import { AnimationTemplate } from "@/types/animation";
import { TileGroupInstance } from "@/types/map";
import { NpcTemplate } from "@/types/npc";
import { isTileGroupTemplate, TileGroupTemplate } from "@/types/tilegroup";
import { Mode, Tileset } from "@/types/tileset";
import { TilesetObjectTemplate } from "@/types/tilesetobject";
import { schedulerYield } from "@/utils/async";
import { hasSolidEdges, subImageData } from "@/utils/image";
import { genTilesetId, loadTilesetImage } from "@/utils/tileset";
import { notifications } from "@mantine/notifications";
import { createAsyncThunk } from "@reduxjs/toolkit";

export const selectTilesetThunk = createAsyncThunk(
  "tilesetEditor/selectTilesetThunk",
  async (ts: Tileset | null, { dispatch, getState }) => {
    const state = getState() as RootState;

    // Already active?
    if (ts?.id === state.tilesetEditor.activeTilesetId) {
      return true;
    }

    if (!ts) {
      dispatch(tsActions.clearSelection());
    }

    // Add it to pixi.js
    await setCanvasTileset(ts);
    // Set it as active, which loads its zoom/pan state
    dispatch(tsActions.setActiveTileset(ts));

    if (ts) {
      const tex = await loadTilesetImage(ts);
      dispatch(
        tsActions.setBounds({
          width: tex.width,
          height: tex.height,
        })
      );
    }
  }
);

export const loadTilesetsThunk = createAsyncThunk(
  "tilesetEditor/loadTilesetsThunk",
  async (_, { dispatch }) => {
    dispatch(uiActions.pushLoadingMessage("Loading tilesets ids..."));
    const tilesets = await loadTilesets();
    for (const tsId of tilesets.ids) {
      await dispatch(loadTilesetThunk({ tsId })).unwrap();
    }
    dispatch(uiActions.popLoadingMessage());
  }
);

export const uploadTilesetThunk = createAsyncThunk(
  "tilesetEditor/uploadTilesetThunk",
  async (
    {
      objectUrl,
      composite,
      restricted,
    }: { objectUrl: string; composite: boolean; restricted: boolean },
    { dispatch }
  ): Promise<Tileset> => {
    const tsId = await genTilesetId(objectUrl);

    const bitmap = await createImageBitmap(
      await fetch(objectUrl).then((res) => res.blob())
    );
    const ts: Tileset = {
      id: tsId,
      objectUrl,
      saved: false,
      width: bitmap.width,
      height: bitmap.height,
      gridSize: defaultTileSize,
      tiles: { ids: [], entities: {} },
      composite,
      restricted,
    };
    bitmap.close();

    await saveTileset(ts);
    await dispatch(loadTilesetThunk({ tsId })).unwrap();
    await router.navigate(`/tilesets/${tsId}`);
    return ts;
  }
);

// New thunk that loads a single tileset and performs all related side effects
export const loadTilesetThunk = createAsyncThunk(
  "tilesetEditor/loadTilesetThunk",
  async ({ tsId }: { tsId: string }, { dispatch }) => {
    dispatch(uiActions.pushLoadingMessage(`Loading tileset ${tsId}...`));

    const ts = await loadTileset(tsId);
    dispatch(tsActions.addTileset({ tsId, ts }));

    const oldSource = gApp.tilesetTextureCache.get(tsId);
    if (oldSource) {
      gApp.tilesetTextureCache.delete(tsId);
    }

    // Preload its texture
    const tex = await loadTilesetImage(ts);

    if (oldSource) {
      oldSource.context2D.clearRect(0, 0, oldSource.width, oldSource.height);
      oldSource.context2D.drawImage(
        tex.source.resource as CanvasImageSource,
        0,
        0
      );
      oldSource.update();
      gApp.tilesetTextureCache.set(tsId, oldSource);
    }

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

    const imageData = gApp.tilesetImageDataCache.get(tsId)!;
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
      gApp.tileEdgeSigs.set(id, computeEdgeSignatures(img));
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
    }

    const canvasSource = gApp.tilesetTextureCache.get(tsId)!;
    canvasSource.context2D.fillStyle = "red";
    canvasSource.context2D.fillRect(
      0,
      0,
      canvasSource.width,
      canvasSource.height
    );
    canvasSource.update();

    // Removing the tileset also removes all of its tile groups, since the
    // createEntityAdapter modifies the tileset's tiles slice directly.
    dispatch(tsActions.removeTileset(tsId));
    notifications.show({
      title: "Tileset removed",
      message: `Tileset ${tsId} has been removed.`,
      color: "green",
    });
    await router.navigate("/tilesets");
  }
);

export const retileThunk = createAsyncThunk(
  "tilesetEditor/retileThunk",
  async (
    { tsId, gridSize }: { tsId: string; gridSize: number },
    { dispatch }
  ) => {
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
    dispatch(tsActions.setTilesetGridSize({ tsId, gridSize }));

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

    const modesUsingSingleSelection: Set<Mode> = new Set([
      "z-index",
      "draw-colliders",
    ]);

    const saveSelection = tool && modesUsingSingleSelection.has(tool);

    if (!saveSelection) {
      dispatch(tsActions.clearSelection());
    }

    dispatch(tsActions.clearCandAnimFrames());
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
      const firstWidth = firstFrame.tileGroup.pos.width;
      const firstHeight = firstFrame.tileGroup.pos.height;
      const newWidth = tg.pos.width;
      const newHeight = tg.pos.height;

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

export const setAnimationFramesThunk = createAsyncThunk(
  "tilesetEditor/setAnimationFramesThunk",
  async (obj: AnimationTemplate, { dispatch }) => {
    // Load the animation's frames into the animator
    // Calculate weights from frame times
    const totalTime = obj.frames.reduce((sum, frame) => sum + frame.time, 0);
    const candFrames = obj.frames.map((frame) => ({
      tileGroup: frame.tg,
      weight: totalTime > 0 ? frame.time / totalTime : 1 / obj.frames.length,
    }));
    dispatch(tsActions.setCandAnimTotalTime(totalTime));
    dispatch(tsActions.setCandAnimFrames(candFrames));
    dispatch(tsActions.setManySelected(obj.frames.map((frame) => frame.tg)));
    dispatch(tsActions.addOneSelected(obj));

    dispatch(tsActions.setActiveTool("animate"));
    notifications.show({
      title: "Animation loaded",
      message: `Loaded ${obj.frames.length} frames for animation "${obj.names.join(", ")}".`,
      color: "green",
    });
  }
);

export const setNpcThunk = createAsyncThunk(
  "tilesetEditor/setNpcThunk",
  async (npc: NpcTemplate, { dispatch }) => {
    dispatch(tsActions.setOneSelected(npc));
    dispatch(tsActions.setActiveTool("make-npc"));
    notifications.show({
      title: "NPC loaded",
      message: `NPC "${npc.name}" loaded.`,
      color: "green",
    });
  }
);

export const clearCandAnimFramesThunk = createAsyncThunk(
  "tilesetEditor/clearCandAnimFramesThunk",
  async (_, { dispatch }) => {
    dispatch(tsActions.clearCandAnimFrames());
    dispatch(tsActions.clearSelection());
  }
);

export const addPaletteObjectsThunk = createAsyncThunk(
  "tilesetEditor/addPaletteObjectsThunk",
  async (
    { tsId, objs: tmplObjs }: { tsId: string; objs: TilesetObjectTemplate[] },
    { dispatch, getState }
  ) => {
    const state = getState() as RootState;
    dispatch(tsActions.setPaletteObjects({ tsId, objs: tmplObjs }));

    // Fix broken tile group instances whose imageIds match the newly added tile
    // groups.
    const brokenTgs = brokenTileGroups(state);
    if (brokenTgs.length > 0) {
      // This lets us lookup all broken tile group instances by the imageId
      const lookup = new Map<string, TileGroupInstance[]>();
      for (const tg of brokenTgs) {
        const arr = lookup.get(tg.imageId) || [];
        arr.push(tg);
        lookup.set(tg.imageId, arr);
      }

      const updates = [];

      for (const tmplObj of tmplObjs) {
        if (isTileGroupTemplate(tmplObj)) {
          const brokenInstances = lookup.get(tmplObj.imageId);
          if (brokenInstances && brokenInstances.length > 0) {
            for (const b of brokenInstances) {
              updates.push({
                id: b.id,
                changes: { tilesetId: tsId, tsObjId: tmplObj.id },
              });
            }
          }
        }
      }

      if (updates.length > 0) {
        dispatch(mapActions.updateMany(updates));
      }
    }
  }
);
