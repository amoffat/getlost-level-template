import { defaultTileSize } from "@/constants";
import { computeEdgeSignatures } from "@/editors/map/utils/autotile";
import {
  generateGridAlignedCoords,
  setCanvasTileset,
  sliceTileset,
} from "@/editors/tileset/loader";
import { globals as gApp } from "@/globals";
import { log } from "@/log";
import {
  deleteTileset,
  loadTileset,
  loadTilesets,
  replaceTilesetImage,
  saveTileset,
} from "@/persist/tileset/api";
import { router } from "@/router";
import { brokenTileGroups } from "@/selectors/map";
import { actions as mapActions } from "@/slices/mapEditor";
import {
  TilesetEditorState,
  actions as tsActions,
  selectors as tsSelectors,
} from "@/slices/tilesetEditor";
import { actions as uiActions } from "@/slices/ui";
import { RootState, store } from "@/store/store";
import { AnimationTemplate, isAnimationTemplate } from "@/types/animation";
import { TileGroupInstance } from "@/types/map";
import { isNpcTemplate, NpcTemplate } from "@/types/npc";
import { Rect } from "@/types/rect";
import { isTileGroupTemplate, TileGroupTemplate } from "@/types/tilegroup";
import { Mode, Tileset } from "@/types/tileset";
import { TemplateObject } from "@/types/tilesetobject";
import { schedulerYield } from "@/utils/async";
import { hasSolidEdges, subImageData } from "@/utils/image";
import { genTilesetId, loadTilesetImage } from "@/utils/tileset";
import { notifications } from "@mantine/notifications";
import { createAsyncThunk } from "@reduxjs/toolkit";
import i18n from "i18next";

export const setActiveTilesetThunk = createAsyncThunk(
  "tilesetEditor/setActiveTilesetThunk",
  async (
    { tsId, objId }: { tsId: string | null; objId?: string },
    { dispatch, getState },
  ) => {
    const state = getState() as RootState;
    const ts = tsId ? tsSelectors.selectTileset(state, tsId) : null;

    if (tsId && ts === null) {
      await dispatch(loadTilesetThunk({ tsId })).unwrap();
    }

    dispatch(tsActions.clearSelection());
    dispatch(clearCandAnimFramesThunk());

    const isAlreadyActive =
      tsId && tsId === state.tilesetEditor.activeTilesetId;
    if (!isAlreadyActive) {
      // Add it to pixi.js
      await setCanvasTileset(ts);
      // Set it as active, which loads its zoom/pan state
      dispatch(tsActions.setActiveTileset({ ts }));

      if (ts) {
        const tex = await loadTilesetImage(ts);
        dispatch(
          tsActions.setBounds({
            width: tex.width,
            height: tex.height,
          }),
        );
      }

      dispatch(tsActions.setActiveTool(null));
    }

    if (objId) {
      const obj = tsSelectors.templateFromId(state, objId)!;
      dispatch(tsActions.setFocusedObj(objId));
      dispatch(tsActions.setOneSelected(obj));

      if (isAnimationTemplate(obj)) {
        dispatch(setAnimationFramesThunk(obj));
        dispatch(tsActions.setMode("animate"));
      } else if (isNpcTemplate(obj)) {
        dispatch(setNpcThunk(obj));
        dispatch(tsActions.setMode("make-npc"));
      } else {
        dispatch(tsActions.setMode("select"));
      }
    }
  },
);

export const loadTilesetsThunk = createAsyncThunk(
  "tilesetEditor/loadTilesetsThunk",
  async (_, { dispatch }) => {
    dispatch(uiActions.pushLoadingMessage(i18n.t("tilesetLoadingIds")));
    const tilesets = await loadTilesets();
    for (const tsId of tilesets.ids) {
      try {
        await dispatch(loadTilesetThunk({ tsId })).unwrap();
      } catch (e) {
        notifications.show({
          title: i18n.t("tilesetLoadFailed"),
          message: i18n.t("tilesetLoadFailedMessage", {
            tsId,
            message: (e as Error).message,
          }),
          color: "red",
        });
      }
    }
    dispatch(uiActions.popLoadingMessage());
  },
);

export const uploadTilesetThunk = createAsyncThunk(
  "tilesetEditor/uploadTilesetThunk",
  async (
    {
      objectUrl,
      composite,
      restricted,
    }: { objectUrl: string; composite: boolean; restricted: boolean },
    { dispatch },
  ): Promise<Tileset> => {
    const tsId = await genTilesetId(objectUrl);

    const bitmap = await createImageBitmap(
      await fetch(objectUrl).then((res) => res.blob()),
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
  },
);

// Loads a single tileset and performs all related side effects. This does not
// make it the active tileset, this just does all the loading to prepare it for
// use.
export const loadTilesetThunk = createAsyncThunk(
  "tilesetEditor/loadTilesetThunk",
  async ({ tsId }: { tsId: string }, { dispatch }) => {
    dispatch(uiActions.pushLoadingMessage(i18n.t("tilesetLoading", { tsId })));

    const ts = await loadTileset(tsId);
    dispatch(tsActions.addTileset({ tsId, ts }));

    const oldSource = gApp.tilesetTextureCache.get(tsId);
    if (oldSource) {
      gApp.tilesetTextureCache.delete(tsId);
    }

    // Preload its texture
    const tex = await loadTilesetImage(ts);

    // Reuse the old canvas if possible to save memory
    if (oldSource) {
      oldSource.context2D.clearRect(0, 0, oldSource.width, oldSource.height);
      oldSource.context2D.drawImage(
        tex.source.resource as CanvasImageSource,
        0,
        0,
      );
      oldSource.update();
      gApp.tilesetTextureCache.set(tsId, oldSource);
    }

    await dispatch(loadEdgeSignaturesThunk(tsId)).unwrap();
    await dispatch(populateTilesetTagsThunk(tsId)).unwrap();

    dispatch(uiActions.popLoadingMessage());

    return true;
  },
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
      uiActions.pushLoadingMessage(i18n.t("tilesetIndexingEdges", { tsId })),
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
  },
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
  },
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
      canvasSource.height,
    );
    canvasSource.update();

    // Removing the tileset also removes all of its tile groups, since the
    // createEntityAdapter modifies the tileset's tiles slice directly.
    dispatch(tsActions.removeTileset(tsId));
    notifications.show({
      title: i18n.t("tilesetRemoved"),
      message: i18n.t("tilesetRemovedMessage", { tsId }),
      color: "green",
    });
    await router.navigate("/tilesets");

    await deleteTileset(tsId);
  },
);

export const replaceTilesetImageThunk = createAsyncThunk(
  "tilesetEditor/replaceTilesetImageThunk",
  async (
    { tsId, objectUrl }: { tsId: string; objectUrl: string },
    { dispatch, getState },
  ) => {
    const state = getState() as RootState;
    const ts = state.tilesetEditor.tilesets[tsId];
    if (!ts) {
      log.error(`replaceTilesetImageThunk: tileset ${tsId} not found`);
      return;
    }

    // Client-side dimension check
    const bitmap = await createImageBitmap(
      await fetch(objectUrl).then((r) => r.blob()),
    );
    const newWidth = bitmap.width;
    const newHeight = bitmap.height;
    bitmap.close();

    if (newWidth !== ts.width || newHeight !== ts.height) {
      notifications.show({
        title: i18n.t("tilesetReplaceImageDimensionMismatch"),
        message: i18n.t("tilesetReplaceImageDimensionMismatchMsg", {
          width: ts.width,
          height: ts.height,
          newWidth,
          newHeight,
        }),
        color: "red",
      });
      return { replaced: false };
    }

    try {
      await replaceTilesetImage(tsId, objectUrl);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      notifications.show({
        title: i18n.t("tilesetReplaceImageFailed"),
        message: i18n.t("tilesetReplaceImageFailedMsg", { msg }),
        color: "red",
      });
      return { replaced: false };
    }

    // Reload the tileset to refresh Redux state, Pixi texture cache, and edge signatures
    await dispatch(loadTilesetThunk({ tsId })).unwrap();

    notifications.show({
      title: i18n.t("tilesetReplaceImageSuccess"),
      message: i18n.t("tilesetReplaceImageSuccessMsg"),
      color: "green",
    });
    return { replaced: true };
  },
);

export const retileThunk = createAsyncThunk(
  "tilesetEditor/retileThunk",
  async (
    {
      tsId,
      gridSize,
      bounds,
    }: { tsId: string; gridSize: number; bounds: Rect },
    { dispatch },
  ) => {
    const state = store.getState();
    const ts = state.tilesetEditor.tilesets[tsId];
    if (!ts) {
      log.error(`retileThunk: tileset ${tsId} not found`);
      return;
    }

    const boundsRight = bounds.x + bounds.width;
    const boundsBottom = bounds.y + bounds.height;

    const ids = Object.values(ts.tiles.entities)
      .filter(isTileGroupTemplate)
      .filter((obj) => !obj.pinned)
      .filter((obj) => {
        const ox = obj.pos.x;
        const oy = obj.pos.y;
        const oRight = ox + obj.pos.width;
        const oBottom = oy + obj.pos.height;
        return (
          ox >= bounds.x &&
          oy >= bounds.y &&
          oRight <= boundsRight &&
          oBottom <= boundsBottom
        );
      })
      .map((obj) => obj.id);
    dispatch(tsActions.deletePaletteObjects({ tsId, ids }));
    dispatch(tsActions.setTilesetGridSize({ tsId, gridSize }));

    const allCoords = generateGridAlignedCoords(tsId, gridSize);
    const coords = allCoords.filter((c) => {
      return (
        c.x >= bounds.x &&
        c.y >= bounds.y &&
        c.x + c.width <= boundsRight &&
        c.y + c.height <= boundsBottom
      );
    });
    const collectionId = crypto.randomUUID();
    await sliceTileset(tsId, coords, collectionId);
  },
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

    if (tool !== "reslice-tiles") {
      dispatch(tsActions.setResliceSelection(null));
    }

    dispatch(tsActions.clearCandAnimFrames());
    dispatch(tsActions.setActiveTool(tool));
  },
);

/**
 * Ensures that the candidate animation frame is the same size as the previous
 * animation frame. Otherwise shows an error.
 */
export const addAnimationFrameThunk = createAsyncThunk(
  "tilesetEditor/addAnimationFrameThunk",
  async (tg: TileGroupTemplate, { dispatch, getState }) => {
    const state = getState() as { tilesetEditor: TilesetEditorState };

    const curFrames = state.tilesetEditor.toolOptions.animator.frames;
    if (curFrames.length > 0) {
      const firstFrame = curFrames[0];
      const firstWidth = firstFrame.tileGroup.pos.width;
      const firstHeight = firstFrame.tileGroup.pos.height;
      const newWidth = tg.pos.width;
      const newHeight = tg.pos.height;

      if (firstWidth !== newWidth || firstHeight !== newHeight) {
        notifications.show({
          title: i18n.t("tilesetAnimFrameSizeMismatch"),
          message: i18n.t("tilesetAnimFrameSizeMismatchMessage", {
            newWidth,
            newHeight,
            firstWidth,
            firstHeight,
          }),
          color: "red",
        });
        return;
      }
    }

    dispatch(tsActions.addCandAnimFrame(tg));
    store.dispatch(tsActions.addOneSelected(tg));
  },
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
      title: i18n.t("tilesetAnimationLoaded"),
      message: i18n.t("tilesetAnimationLoadedMessage", {
        count: obj.frames.length,
        name: obj.slotNames.join(", "),
      }),
      color: "green",
    });
  },
);

export const setNpcThunk = createAsyncThunk(
  "tilesetEditor/setNpcThunk",
  async (npc: NpcTemplate, { dispatch }) => {
    dispatch(tsActions.setOneSelected(npc));
    dispatch(tsActions.setActiveTool("make-npc"));
    notifications.show({
      title: i18n.t("tilesetNpcLoaded"),
      message: i18n.t("tilesetNpcLoadedMessage", { name: npc.id }),
      color: "green",
    });
  },
);

export const clearCandAnimFramesThunk = createAsyncThunk(
  "tilesetEditor/clearCandAnimFramesThunk",
  async (_, { dispatch }) => {
    dispatch(tsActions.clearCandAnimFrames());
    dispatch(tsActions.clearSelection());
  },
);

export const addPaletteObjectsThunk = createAsyncThunk(
  "tilesetEditor/addPaletteObjectsThunk",
  async (
    { tsId, objs: tmplObjs }: { tsId: string; objs: TemplateObject[] },
    { dispatch, getState },
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
  },
);
