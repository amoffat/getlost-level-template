import { defaultAnimTime } from "@/constants";
import { log } from "@/log";
import { RootState } from "@/store/store";
import { AnimationTemplate, isAnimationTemplate } from "@/types/animation";
import { isNpcTemplate, NpcTemplate } from "@/types/npc";
import { Rect } from "@/types/rect";
import { isTileGroupTemplate, TileGroupTemplate } from "@/types/tilegroup";
import { Mode, Tileset } from "@/types/tileset";
import { TemplateObject } from "@/types/tilesetobject";
import { AnimatorOpts, CandidateAnimFrame } from "@/types/tools";
import { Pan, Zoom, ZoomPan } from "@/types/zoompan";
import { HasId } from "@/utils/misc";
import { resizeWeights } from "@/utils/normalizedSliders";
import { calcDefaultZoomPan } from "@/utils/zoompan";
import {
  createEntityAdapter,
  createSelector,
  createSlice,
  EntityState,
  PayloadAction,
} from "@reduxjs/toolkit";

const DEFAULT_ZOOMPAN: ZoomPan = { zoom: 1, pan: { x: 0, y: 0 } };

/**
 * Propagate updated AnimationTemplates into any NpcTemplates in the same
 * tileset that embed those animations. Must be called from within an
 * Immer-producing reducer so that direct mutations are tracked correctly.
 */
function propagateAnimationChangesToNpcs(
  tiles: EntityState<TemplateObject, string>,
  animationIds: Set<string> | string[],
): void {
  const idSet =
    animationIds instanceof Set ? animationIds : new Set(animationIds);
  if (idSet.size === 0) return;
  for (const obj of Object.values(tiles.entities)) {
    if (!obj || !isNpcTemplate(obj)) continue;
    for (const animRecord of Object.values(obj.animations)) {
      if (!idSet.has(animRecord.animation.id)) continue;

      const updatedAnim = tiles.entities[animRecord.animation.id];
      if (updatedAnim && isAnimationTemplate(updatedAnim)) {
        animRecord.animation = updatedAnim;
      }
      // else: animation was deleted from the tileset — preserve the existing copy
    }
  }
}

/**
 * After updating one or more TileGroupTemplates in a tileset, propagate those
 * changes into any AnimationTemplate frames in the same tileset that reference
 * the updated tilegroup(s), then propagate the affected animations into any
 * NpcTemplates that embed them. Must be called from within an Immer-producing
 * reducer so that direct mutations are tracked correctly.
 */
function propagateTileGroupChangesToAnimations(
  tiles: EntityState<TemplateObject, string>,
  tileGroupIds: Set<string> | string[],
): void {
  const idSet =
    tileGroupIds instanceof Set ? tileGroupIds : new Set(tileGroupIds);
  if (idSet.size === 0) return;

  // Replace each matching frame's tilegroup with the current copy from the
  // tileset, and track which animations were affected.
  const updatedAnimationIds = new Set<string>();
  for (const obj of Object.values(tiles.entities)) {
    if (!obj || !isAnimationTemplate(obj)) continue;

    for (const frame of obj.frames) {
      if (!idSet.has(frame.tg.id)) continue;
      const updatedTg = tiles.entities[frame.tg.id];
      if (updatedTg && isTileGroupTemplate(updatedTg)) {
        frame.tg = updatedTg;
        updatedAnimationIds.add(obj.id);
      }
      // else: tilegroup was deleted from the tileset — preserve the existing copy
    }
  }

  propagateAnimationChangesToNpcs(tiles, updatedAnimationIds);
}

type ToolOptMapping = {
  animator: AnimatorOpts;
  collider: {
    brushSize: number;
    brushShape: "square" | "circle";
    mode: "paint" | "erase";
    drawOnOpaqueOnly: boolean;
    overlayOpacity: number;
    showColliders: boolean;
    simplify: number;
  };
};
type ToolWithOptions = keyof ToolOptMapping;

const reconcilePrefix = "tilesetEditor";
export const selectedAdapter = createEntityAdapter<HasId>();
export const tileAdapter = createEntityAdapter<TemplateObject>();
const createTsSelector = createSelector.withTypes<TilesetEditorState>();
const createRootSelector = createSelector.withTypes<RootState>();
export interface TilesetEditorState {
  grid: {
    size: number;
    visible: boolean;
  };
  canvas: {
    width: number;
    height: number;
  };
  bounds: Rect;
  selectedTool: Mode | null;
  activeModeStack: Mode[];
  activeTilesetId: string | null;
  activeZoomPan: ZoomPan;
  tilesetIds: string[];
  tilesets: Record<string, Tileset>;
  resliceSelection: Rect | null;
  tilesetZoomPans: Record<string, ZoomPan>;
  // Async status flags for initial tileset loading
  loadingTilesets: boolean;
  tilesetsLoaded: boolean;
  tilesetsError: string | null;
  selectedTiles: EntityState<HasId, string>;
  toolOptions: {
    [K in ToolWithOptions]: ToolOptMapping[K];
  };
  // obj id to tileset id
  objIdToTs: Record<string, string>;
  // image id to tileset id. used for healing broken references
  imageIdToTs: Record<string, string>;
}

const activeTileset = createTsSelector(
  [(state) => state.activeTilesetId, (state) => state.tilesets],
  (tsId, tilesets): Tileset | null => (tsId ? (tilesets[tsId] ?? null) : null),
);

const templateFromId = createTsSelector(
  [
    (state) => state.tilesets,
    (state) => state.objIdToTs,
    (_, instanceId: string) => instanceId,
  ],
  (
    tilesets: Record<string, Tileset>,
    objIdToTs: Record<string, string>,
    instanceId: string,
  ): TemplateObject | null => {
    const tsId = objIdToTs[instanceId];
    if (!tsId) return null;
    const ts = tilesets[tsId];
    if (!ts) return null;
    const obj = ts.tiles.entities[instanceId];
    return obj ?? null;
  },
);

export const slice = createSlice({
  name: "tilesetEditor",
  initialState: {
    grid: {
      size: 16,
      visible: true,
    },
    canvas: {
      width: 1024,
      height: 1024,
    },
    bounds: { x: 0, y: 0, width: 0, height: 0 },
    selectedTool: null,
    activeModeStack: [],
    activeTilesetId: null,
    activeZoomPan: DEFAULT_ZOOMPAN,
    tilesetIds: [],
    tilesets: {},
    scanPos: null,
    resliceSelection: null,
    tilesetZoomPans: {},
    loadingTilesets: false,
    tilesetsLoaded: false,
    tilesetsError: null,
    selectedTiles: selectedAdapter.getInitialState(),
    toolOptions: {
      animator: {
        frames: [],
        totalTime: defaultAnimTime,
      },
      collider: {
        brushSize: 8,
        brushShape: "square",
        mode: "paint",
        drawOnOpaqueOnly: true,
        overlayOpacity: 0.6,
        showColliders: false,
        simplify: 1.0,
      },
    },
    objIdToTs: {},
    imageIdToTs: {},
  } as TilesetEditorState,
  reducers: {
    setGridVisible(state, action: PayloadAction<boolean>) {
      state.grid.visible = action.payload;
    },
    setGridSize(state, action: PayloadAction<number>) {
      state.grid.size = action.payload;
    },

    setActiveTool(state, action: PayloadAction<Mode | null>) {
      state.selectedTool = action.payload;
    },

    setToolOptions<K extends ToolWithOptions>(
      state: TilesetEditorState,
      action: PayloadAction<{ tool: K; options: Partial<ToolOptMapping[K]> }>,
    ) {
      const { tool, options } = action.payload;
      state.toolOptions[tool] = { ...state.toolOptions[tool], ...options };
    },

    addCandAnimFrame(state, action: PayloadAction<TileGroupTemplate>) {
      const frames = state.toolOptions.animator.frames;
      const newLength = frames.length + 1;
      const weights = resizeWeights(
        frames.map((f) => f.weight),
        newLength,
      );
      // Update existing frames with rebalanced weights
      for (let i = 0; i < frames.length; i++) {
        frames[i].weight = weights[i];
      }
      // Add new frame with its weight
      frames.push({
        tileGroup: action.payload,
        weight: weights[newLength - 1],
      });
    },

    removeCandAnimIdx(state, action: PayloadAction<number>) {
      const idx = action.payload;
      const frames = state.toolOptions.animator.frames;
      frames.splice(idx, 1);
      // Rebalance weights after removal
      const newLength = frames.length;
      if (newLength > 0) {
        const weights = resizeWeights(
          frames.map((f) => f.weight),
          newLength,
        );
        for (let i = 0; i < newLength; i++) {
          frames[i].weight = weights[i];
        }
      }
    },

    clearCandAnimFrames(state) {
      state.toolOptions.animator.frames = [];
    },

    reorderCandAnimFrames(
      state,
      action: PayloadAction<{ from: number; to: number }>,
    ) {
      const { from, to } = action.payload;
      const frames = state.toolOptions.animator.frames;
      if (
        from === to ||
        from < 0 ||
        to < 0 ||
        from >= frames.length ||
        to >= frames.length
      ) {
        return;
      }
      const [moved] = frames.splice(from, 1);
      frames.splice(to, 0, moved);
    },

    updateCandAnimFrameWeight(
      state,
      action: PayloadAction<{ idx: number; weight: number }>,
    ) {
      const { idx, weight } = action.payload;
      const frames = state.toolOptions.animator.frames;
      if (idx >= 0 && idx < frames.length) {
        frames[idx].weight = weight;
      }
    },

    updateAllCandAnimFrameWeights(state, action: PayloadAction<number[]>) {
      const weights = action.payload;
      const frames = state.toolOptions.animator.frames;
      for (let i = 0; i < Math.min(weights.length, frames.length); i++) {
        frames[i].weight = weights[i];
      }
    },

    setCandAnimFrames(state, action: PayloadAction<CandidateAnimFrame[]>) {
      state.toolOptions.animator.frames = action.payload;
    },

    setCandAnimTotalTime(state, action: PayloadAction<number>) {
      state.toolOptions.animator.totalTime = action.payload;
    },

    pushMode(state, action: PayloadAction<Mode>) {
      if (state.activeModeStack.at(-1) === action.payload) return;
      state.activeModeStack.push(action.payload);
    },
    popMode(state) {
      state.activeModeStack.pop();
    },

    updateTilesetObject: {
      prepare: (payload: {
        tsId: string;
        obj: TemplateObject;
        changes: Partial<TemplateObject>;
      }) => ({
        meta: {
          reconcilePrefix,
          reconcileType: "update" as const,
          reconcile: { id: payload.obj.id, changes: payload.changes },
        },
        payload,
      }),
      reducer(
        state,
        action: PayloadAction<{
          obj: TemplateObject;
          changes: Partial<TemplateObject>;
        }>,
      ) {
        const { obj, changes } = action.payload;
        const ts = state.tilesets[obj.tilesetId];
        if (!ts) return;
        tileAdapter.updateOne(ts.tiles, { id: obj.id, changes: changes });
        if (isTileGroupTemplate(ts.tiles.entities[obj.id])) {
          propagateTileGroupChangesToAnimations(ts.tiles, [obj.id]);
        } else if (isAnimationTemplate(ts.tiles.entities[obj.id])) {
          propagateAnimationChangesToNpcs(ts.tiles, [obj.id]);
        }
      },
    },

    updateManyTilesetObjects: {
      prepare: (payload: {
        tsId: string;
        changes: { id: string; changes: Partial<TemplateObject> }[];
      }) => ({
        meta: {
          reconcilePrefix,
          reconcileType: "update" as const,
          reconcile: payload.changes,
        },
        payload,
      }),
      reducer(
        state,
        action: PayloadAction<{
          tsId: string;
          changes: { id: string; changes: Partial<TemplateObject> }[];
        }>,
      ) {
        const { tsId, changes } = action.payload;
        if (changes.length === 0) return;

        const ts = state.tilesets[tsId];
        if (!ts) return;

        tileAdapter.updateMany(ts.tiles, changes);
        const tgIds = changes
          .filter(({ id }) => isTileGroupTemplate(ts.tiles.entities[id]))
          .map(({ id }) => id);
        propagateTileGroupChangesToAnimations(ts.tiles, tgIds);
        const animIds = changes
          .filter(({ id }) => isAnimationTemplate(ts.tiles.entities[id]))
          .map(({ id }) => id);
        propagateAnimationChangesToNpcs(ts.tiles, animIds);
      },
    },

    setMode(state, action: PayloadAction<Mode | null>) {
      const mode = action.payload;
      state.activeModeStack = mode === null ? [] : [mode];
    },
    setBounds(state, action: PayloadAction<{ width: number; height: number }>) {
      const { width, height } = action.payload;
      state.bounds = { ...state.bounds, width, height };
    },
    setCanvasSize(
      state,
      action: PayloadAction<{ width: number; height: number }>,
    ) {
      const { width, height } = action.payload;
      state.canvas.width = width;
      state.canvas.height = height;
    },
    setActiveTileset: {
      prepare: (payload: { ts: Tileset | null }) => ({
        meta: {
          reconcilePrefix,
          reconcileType: "setAll" as const,
          reconcile: payload.ts ? Object.values(payload.ts.tiles.entities) : [],
        },
        payload,
      }),
      reducer: (state, action: PayloadAction<{ ts: Tileset | null }>) => {
        const { ts } = action.payload;
        state.activeTilesetId = ts?.id ?? null;

        let zoomPan = DEFAULT_ZOOMPAN;
        if (ts) {
          zoomPan =
            state.tilesetZoomPans[ts.id] ??
            calcDefaultZoomPan(
              state.canvas.width,
              state.canvas.height,
              ts.width,
              ts.height,
            );

          state.grid.size = ts.gridSize;
        }
        state.activeZoomPan = zoomPan;
      },
    },
    addTileset: (
      state,
      action: PayloadAction<{
        tsId: string;
        ts: Tileset;
      }>,
    ) => {
      const { ts } = action.payload;
      state.tilesets[ts.id] = ts;
      if (!state.tilesetIds.includes(ts.id)) {
        state.tilesetIds.push(ts.id);
        for (const obj of Object.values(ts.tiles.entities)) {
          state.objIdToTs[obj.id] = ts.id;
          if (isTileGroupTemplate(obj)) {
            state.imageIdToTs[obj.imageId] = ts.id;
          }
        }
      }
    },

    removeTileset: (state, action: PayloadAction<string>) => {
      const tsId = action.payload;
      delete state.tilesets[tsId];
      state.tilesetIds = state.tilesetIds.filter((id) => id !== tsId);
      if (state.activeTilesetId === tsId) {
        state.activeTilesetId = null;
        state.activeZoomPan = DEFAULT_ZOOMPAN;
        state.bounds = { x: 0, y: 0, width: 0, height: 0 };
      }
      delete state.tilesetZoomPans[tsId];
      // Clean up fast lookup
      for (const id of Object.keys(state.objIdToTs)) {
        if (state.objIdToTs[id] === tsId) {
          delete state.objIdToTs[id];
        }
      }
      for (const id of Object.keys(state.imageIdToTs)) {
        if (state.imageIdToTs[id] === tsId) {
          delete state.imageIdToTs[id];
        }
      }
    },

    setResliceSelection: (state, action: PayloadAction<Rect | null>) => {
      state.resliceSelection = action.payload;
    },
    setFocusedObj(state, action: PayloadAction<string>) {
      const obj = templateFromId(state, action.payload);
      if (!obj) return;

      if (isTileGroupTemplate(obj)) {
        // Center zoomPan on the object
        const objCenterX = obj.pos.x + obj.pos.width / 2;
        const objCenterY = obj.pos.y + obj.pos.height / 2;

        const zoom = 2; // Zoom in 2x to focus on the object
        // Pan positions the container, so we need: canvasCenter - (worldObjectCenter * zoom)
        const panX = state.canvas.width / 2 - objCenterX * zoom;
        const panY = state.canvas.height / 2 - objCenterY * zoom;

        const zoomPan = { zoom, pan: { x: panX, y: panY } };
        state.activeZoomPan = zoomPan;
      }
    },
    setZoom: (state, action: PayloadAction<Zoom>) => {
      const zoom = action.payload;
      const tsId = state.activeTilesetId;
      state.activeZoomPan.zoom = zoom;
      if (!tsId) return;

      const tsZoomPan = state.tilesetZoomPans[tsId];
      if (!tsZoomPan) {
        state.tilesetZoomPans[tsId] = state.activeZoomPan;
      }
      state.tilesetZoomPans[tsId].zoom = zoom;
    },
    setPan: (state, action: PayloadAction<Pan>) => {
      const pan = action.payload;
      const tsId = state.activeTilesetId;
      state.activeZoomPan.pan = pan;
      if (!tsId) return;

      const tsZoomPan = state.tilesetZoomPans[tsId];
      if (!tsZoomPan) {
        state.tilesetZoomPans[tsId] = state.activeZoomPan;
      }
      state.tilesetZoomPans[tsId].pan = pan;
    },

    setTilesetGridSize(
      state,
      action: PayloadAction<{ tsId: string; gridSize: number }>,
    ) {
      const { tsId, gridSize } = action.payload;
      const ts = state.tilesets[tsId];
      if (!ts) return;
      ts.gridSize = gridSize;
    },

    markSaved(state, action: PayloadAction<{ tsId: string; saved: boolean }>) {
      const { tsId, saved } = action.payload;
      const ts = state.tilesets[tsId];
      ts.saved = saved;
    },

    setPaletteObjects: {
      prepare: (payload: { tsId: string; objs: TemplateObject[] }) => ({
        meta: {
          reconcilePrefix,
          reconcileType: "add" as const,
          reconcile: payload.objs,
        },
        payload,
      }),
      reducer(
        state,
        action: PayloadAction<{ tsId: string; objs: TemplateObject[] }>,
      ) {
        const { tsId, objs } = action.payload;
        const ts = state.tilesets[tsId];
        tileAdapter.setMany(ts.tiles, objs);
        for (const obj of objs) {
          state.objIdToTs[obj.id] = tsId;
          if (isTileGroupTemplate(obj)) {
            state.imageIdToTs[obj.imageId] = tsId;
          }
        }
      },
    },

    deletePaletteObjects: {
      prepare: (payload: { tsId: string; ids: string[] }) => ({
        meta: {
          reconcilePrefix,
          reconcileType: "remove" as const,
          reconcile: payload.ids,
        },
        payload,
      }),
      reducer(state, action: PayloadAction<{ tsId: string; ids: string[] }>) {
        const { tsId, ids } = action.payload;
        const ts = state.tilesets[tsId];

        for (const id of ids) {
          delete state.objIdToTs[id];
          const obj = ts.tiles.entities[id];
          if (isTileGroupTemplate(obj)) {
            delete state.imageIdToTs[obj.imageId];
          }
        }

        tileAdapter.removeMany(ts.tiles, ids);
      },
    },

    setOneSelected: (state, action: PayloadAction<TemplateObject>) => {
      const obj = action.payload;
      selectedAdapter.removeAll(state.selectedTiles);
      selectedAdapter.setOne(state.selectedTiles, obj);
    },

    addOneSelected: (state, action: PayloadAction<TemplateObject>) => {
      const obj = action.payload;
      selectedAdapter.setOne(state.selectedTiles, obj);
    },

    setManySelected: (state, action: PayloadAction<TemplateObject[]>) => {
      const objs = action.payload;
      selectedAdapter.removeAll(state.selectedTiles);
      selectedAdapter.setMany(state.selectedTiles, objs);
    },

    addManySelected: (state, action: PayloadAction<TemplateObject[]>) => {
      const objs = action.payload;
      selectedAdapter.setMany(state.selectedTiles, objs);
    },

    updateManySelected: (
      state,
      action: PayloadAction<{ id: string; changes: Partial<TemplateObject> }[]>,
    ) => {
      selectedAdapter.updateMany(state.selectedTiles, action.payload);
    },

    removeOneSelected: (state, action: PayloadAction<string>) => {
      selectedAdapter.removeOne(state.selectedTiles, action.payload);
    },

    clearSelection: (state) => {
      selectedAdapter.removeAll(state.selectedTiles);
    },
  },
  extraReducers: (builder) => {
    // Because we don't want to directly import the thunk (avoids circular deps),
    // we key off the action type strings.
    builder
      .addMatcher(
        (action): action is any =>
          action.type === "tilesetEditor/loadTilesetsThunk/pending",
        (state) => {
          state.loadingTilesets = true;
          state.tilesetsError = null;
        },
      )
      .addMatcher(
        (action): action is any =>
          action.type === "tilesetEditor/loadTilesetsThunk/fulfilled",
        (state) => {
          state.loadingTilesets = false;
          state.tilesetsLoaded = true;
        },
      )
      .addMatcher(
        (action): action is any =>
          action.type === "tilesetEditor/loadTilesetsThunk/rejected",
        (state, action) => {
          state.loadingTilesets = false;
          state.tilesetsError =
            action.error?.message ?? "Failed to load tilesets";
        },
      );
  },
  selectors: {
    selectTileset: createTsSelector(
      [(state, tsId: string) => state.tilesets[tsId]],
      (ts): Tileset | null => (ts ? ts : null),
    ),
    activeTileset,
    activeTilesetGroups: createTsSelector(
      [activeTileset],
      (ts): TileGroupTemplate[] => {
        if (!ts) return [];
        const objs = ts.tiles.ids
          .map((id) => ts.tiles.entities[id])
          .filter(isTileGroupTemplate);
        const broken = ts.tiles.ids.filter(
          (id) => ts.tiles.entities[id] === undefined,
        );
        if (broken.length) {
          log.warn({ broken }, "Broken tile ids detected");
        }
        return objs;
      },
    ),
    selectMode: createTsSelector(
      [(state) => state.activeModeStack],
      (activeModeStack): Mode => activeModeStack.at(-1) ?? "select",
    ),
    paletteSelectedIds: createTsSelector(
      [(state) => state.selectedTiles.ids],
      (selectedIds): Set<string> => new Set(selectedIds as string[]),
    ),
    selectedObjects: createTsSelector(
      [(state) => state.selectedTiles, activeTileset],
      (tiles, ts): TemplateObject[] => {
        if (!ts) return [];
        return tiles.ids
          .map((id) => ts.tiles.entities[id])
          .filter((obj) => obj !== undefined);
      },
      {
        memoizeOptions: {
          resultEqualityCheck: (a, b) => {
            if (a.length !== b.length) return false;
            for (let i = 0; i < a.length; i++) {
              if (a[i].id !== b[i].id) return false;
            }
            return true;
          },
        },
      },
    ),
    templatesFromIds: createTsSelector(
      [
        (state) => state.tilesets,
        (state) => state.objIdToTs,
        (_, instanceIds: string[]) => instanceIds,
      ],
      (
        tilesets: Record<string, Tileset>,
        objIdToTs: Record<string, string>,
        instanceIds: string[],
      ): { inst: string; tmpl: TemplateObject }[] => {
        return instanceIds
          .map((instanceId) => {
            const tsId = objIdToTs[instanceId];
            if (!tsId) return null;
            const ts = tilesets[tsId];
            if (!ts) return null;
            const obj = ts.tiles.entities[instanceId];
            if (!obj) return null;
            return { inst: instanceId, tmpl: obj };
          })
          .filter((x) => x !== null);
      },
    ),
    templateFromId,
    animations: createTsSelector(
      [(state, tsId) => state.tilesets[tsId]],
      (ts): AnimationTemplate[] => {
        const animations: AnimationTemplate[] = [];
        for (const obj of Object.values(ts.tiles.entities)) {
          if (isAnimationTemplate(obj)) {
            animations.push(obj);
          }
        }
        return animations;
      },
    ),
    npcs: createTsSelector(
      [(state, tsId) => state.tilesets[tsId]],
      (ts): NpcTemplate[] => {
        const npcs: NpcTemplate[] = [];
        for (const obj of Object.values(ts.tiles.entities)) {
          if (isNpcTemplate(obj)) {
            npcs.push(obj);
          }
        }
        return npcs;
      },
    ),
  },
});

const selectTilesets = createRootSelector(
  [
    (state) => state.tilesetEditor.tilesetIds,
    (state) => state.tilesetEditor.tilesets,
    (state) => state.ui.flags.showHiddenTilesets,
  ],
  (tilesetIds, tilesets, showHiddenTilesets): Record<string, Tileset> =>
    tilesetIds
      .map((id) => tilesets[id])
      .filter((ts) => (ts.hidden ? showHiddenTilesets : true))
      .reduce(
        (acc, ts) => {
          acc[ts.id] = ts;
          return acc;
        },
        {} as Record<string, Tileset>,
      ),
);

export const selectors = { ...slice.selectors, selectTilesets };
export const actions = slice.actions;
