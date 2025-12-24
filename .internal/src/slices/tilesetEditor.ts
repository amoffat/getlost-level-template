import { defaultAnimTime } from "@/constants";
import { log } from "@/log";
import { RootState } from "@/store/store";
import { AnimationTemplate, isAnimationTemplate } from "@/types/animation";
import { isNpcTemplate, NpcTemplate } from "@/types/npc";
import { Rect } from "@/types/rect";
import { isTileGroupTemplate, TileGroupTemplate } from "@/types/tilegroup";
import { Mode, Tileset } from "@/types/tileset";
import { TilesetObjectTemplate } from "@/types/tilesetobject";
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

type ToolOptMapping = object;
type ToolWithOptions = keyof ToolOptMapping;

export interface CandidateAnimFrame {
  tileGroup: TileGroupTemplate;
  weight: number; // 0-1 fraction representing time allocation
}

const reconcilePrefix = "tilesetEditor";
export const selectedAdapter = createEntityAdapter<HasId>();
export const tileAdapter = createEntityAdapter<TilesetObjectTemplate>();
const createTsSelector = createSelector.withTypes<TilesetEditorState>();

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
  scanPos: Rect | null;
  tilesetZoomPans: Record<string, ZoomPan>;
  // Async status flags for initial tileset loading
  loadingTilesets: boolean;
  tilesetsLoaded: boolean;
  tilesetsError: string | null;
  selectedTiles: EntityState<HasId, string>;
  toolOptions: {
    [K in ToolWithOptions]: ToolOptMapping[K];
  };
  candAnimTotalTime: number;
  candAnimFrames: CandidateAnimFrame[];
  // obj id to tileset id
  objIdToTs: Record<string, string>;
  // image id to tileset id. used for healing broken references
  imageIdToTs: Record<string, string>;
}

const activeTileset = createTsSelector(
  [(state) => state.activeTilesetId, (state) => state.tilesets],
  (tsId, tilesets): Tileset | null => (tsId ? (tilesets[tsId] ?? null) : null)
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
    tilesetZoomPans: {},
    loadingTilesets: false,
    tilesetsLoaded: false,
    tilesetsError: null,
    selectedTiles: selectedAdapter.getInitialState(),
    toolOptions: {
      animator: {
        frames: [],
      },
    },
    candAnimTotalTime: defaultAnimTime,
    candAnimFrames: [],
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
      _state: TilesetEditorState,
      _action: PayloadAction<{ tool: K; options: Partial<ToolOptMapping[K]> }>
    ) {
      // const { tool, options } = action.payload;
      // state.toolOptions[tool] = { ...state.toolOptions[tool], ...options };
    },

    addCandAnimFrame(state, action: PayloadAction<TileGroupTemplate>) {
      const newLength = state.candAnimFrames.length + 1;
      const weights = resizeWeights(
        state.candAnimFrames.map((f) => f.weight),
        newLength
      );
      // Update existing frames with rebalanced weights
      for (let i = 0; i < state.candAnimFrames.length; i++) {
        state.candAnimFrames[i].weight = weights[i];
      }
      // Add new frame with its weight
      state.candAnimFrames.push({
        tileGroup: action.payload,
        weight: weights[newLength - 1],
      });
    },

    removeCandAnimIdx(state, action: PayloadAction<number>) {
      const idx = action.payload;
      state.candAnimFrames.splice(idx, 1);
      // Rebalance weights after removal
      const newLength = state.candAnimFrames.length;
      if (newLength > 0) {
        const weights = resizeWeights(
          state.candAnimFrames.map((f) => f.weight),
          newLength
        );
        for (let i = 0; i < newLength; i++) {
          state.candAnimFrames[i].weight = weights[i];
        }
      }
    },

    clearCandAnimFrames(state) {
      state.candAnimFrames = [];
    },

    reorderCandAnimFrames(
      state,
      action: PayloadAction<{ from: number; to: number }>
    ) {
      const { from, to } = action.payload;
      if (
        from === to ||
        from < 0 ||
        to < 0 ||
        from >= state.candAnimFrames.length ||
        to >= state.candAnimFrames.length
      ) {
        return;
      }
      const arr = state.candAnimFrames;
      const [moved] = arr.splice(from, 1);
      arr.splice(to, 0, moved);
    },

    updateCandAnimFrameWeight(
      state,
      action: PayloadAction<{ idx: number; weight: number }>
    ) {
      const { idx, weight } = action.payload;
      if (idx >= 0 && idx < state.candAnimFrames.length) {
        state.candAnimFrames[idx].weight = weight;
      }
    },

    updateAllCandAnimFrameWeights(state, action: PayloadAction<number[]>) {
      const weights = action.payload;
      for (
        let i = 0;
        i < Math.min(weights.length, state.candAnimFrames.length);
        i++
      ) {
        state.candAnimFrames[i].weight = weights[i];
      }
    },

    setCandAnimFrames(state, action: PayloadAction<CandidateAnimFrame[]>) {
      state.candAnimFrames = action.payload;
    },

    setCandAnimTotalTime(state, action: PayloadAction<number>) {
      state.candAnimTotalTime = action.payload;
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
        obj: TilesetObjectTemplate;
        changes: Partial<TilesetObjectTemplate>;
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
          obj: TilesetObjectTemplate;
          changes: Partial<TilesetObjectTemplate>;
        }>
      ) {
        const { obj, changes } = action.payload;
        const ts = state.tilesets[obj.tilesetId];
        if (!ts) return;
        tileAdapter.updateOne(ts.tiles, { id: obj.id, changes: changes });
      },
    },

    updateManyTilesetObjects: {
      prepare: (payload: {
        tsId: string;
        changes: { id: string; changes: Partial<TilesetObjectTemplate> }[];
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
          changes: { id: string; changes: Partial<TilesetObjectTemplate> }[];
        }>
      ) {
        const { tsId, changes } = action.payload;
        if (changes.length === 0) return;

        const ts = state.tilesets[tsId];
        if (!ts) return;

        tileAdapter.updateMany(ts.tiles, changes);
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
      action: PayloadAction<{ width: number; height: number }>
    ) {
      const { width, height } = action.payload;
      state.canvas.width = width;
      state.canvas.height = height;
    },
    setActiveTileset: {
      prepare: (payload: Tileset | null) => ({
        meta: {
          reconcilePrefix,
          reconcileType: "setAll" as const,
          reconcile: payload ? Object.values(payload.tiles.entities) : [],
        },
        payload,
      }),
      reducer: (state, action: PayloadAction<Tileset | null>) => {
        const ts = action.payload;
        state.activeTilesetId = ts?.id ?? null;

        let zoomPan = DEFAULT_ZOOMPAN;
        if (ts) {
          zoomPan =
            state.tilesetZoomPans[ts.id] ??
            calcDefaultZoomPan(
              state.canvas.width,
              state.canvas.height,
              ts.width,
              ts.height
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
      }>
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

    setScanPos: (state, action: PayloadAction<Rect | null>) => {
      state.scanPos = action.payload;
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
      action: PayloadAction<{ tsId: string; gridSize: number }>
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
      prepare: (payload: { tsId: string; objs: TilesetObjectTemplate[] }) => ({
        meta: {
          reconcilePrefix,
          reconcileType: "add" as const,
          reconcile: payload.objs,
        },
        payload,
      }),
      reducer(
        state,
        action: PayloadAction<{ tsId: string; objs: TilesetObjectTemplate[] }>
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

    setOneSelected: (state, action: PayloadAction<TilesetObjectTemplate>) => {
      const obj = action.payload;
      selectedAdapter.removeAll(state.selectedTiles);
      selectedAdapter.setOne(state.selectedTiles, obj);
    },

    addOneSelected: (state, action: PayloadAction<TilesetObjectTemplate>) => {
      const obj = action.payload;
      selectedAdapter.setOne(state.selectedTiles, obj);
    },

    setManySelected: (
      state,
      action: PayloadAction<TilesetObjectTemplate[]>
    ) => {
      const objs = action.payload;
      selectedAdapter.removeAll(state.selectedTiles);
      selectedAdapter.setMany(state.selectedTiles, objs);
    },

    addManySelected: (
      state,
      action: PayloadAction<TilesetObjectTemplate[]>
    ) => {
      const objs = action.payload;
      selectedAdapter.setMany(state.selectedTiles, objs);
    },

    updateManySelected: (
      state,
      action: PayloadAction<
        { id: string; changes: Partial<TilesetObjectTemplate> }[]
      >
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
        }
      )
      .addMatcher(
        (action): action is any =>
          action.type === "tilesetEditor/loadTilesetsThunk/fulfilled",
        (state) => {
          state.loadingTilesets = false;
          state.tilesetsLoaded = true;
        }
      )
      .addMatcher(
        (action): action is any =>
          action.type === "tilesetEditor/loadTilesetsThunk/rejected",
        (state, action) => {
          state.loadingTilesets = false;
          state.tilesetsError =
            action.error?.message ?? "Failed to load tilesets";
        }
      );
  },
  selectors: {
    selectTileset: createTsSelector(
      [(state, tsId: string) => state.tilesets[tsId]],
      (ts): Tileset | null => (ts ? ts : null)
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
          (id) => ts.tiles.entities[id] === undefined
        );
        if (broken.length) {
          log.warn({ broken }, "Broken tile ids detected");
        }
        return objs;
      }
    ),
    selectMode: createTsSelector(
      [(state) => state.activeModeStack],
      (activeModeStack): Mode => activeModeStack.at(-1) ?? "select"
    ),
    paletteSelectedIds: createTsSelector(
      [(state) => state.selectedTiles.ids],
      (selectedIds): Set<string> => new Set(selectedIds as string[])
    ),
    selectedObjects: createTsSelector(
      [(state) => state.selectedTiles, activeTileset],
      (tiles, ts): TilesetObjectTemplate[] => {
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
      }
    ),
    templatesFromInstanceIds: createTsSelector(
      [
        (state) => state.tilesets,
        (state) => state.objIdToTs,
        (_, instanceIds: string[]) => instanceIds,
      ],
      (
        tilesets: Record<string, Tileset>,
        objIdToTs: Record<string, string>,
        instanceIds: string[]
      ): (TileGroupTemplate | null)[] => {
        return instanceIds.map((instanceId) => {
          const tsId = objIdToTs[instanceId];
          if (!tsId) return null;
          const ts = tilesets[tsId];
          if (!ts) return null;
          const obj = ts.tiles.entities[instanceId];
          if (!obj || !isTileGroupTemplate(obj)) return null;
          return obj;
        });
      }
    ),
    templateFromInstanceId: createTsSelector(
      [
        (state) => state.tilesets,
        (state) => state.objIdToTs,
        (_, instanceId: string) => instanceId,
      ],
      (
        tilesets: Record<string, Tileset>,
        objIdToTs: Record<string, string>,
        instanceId: string
      ): TilesetObjectTemplate | null => {
        const tsId = objIdToTs[instanceId];
        if (!tsId) return null;
        const ts = tilesets[tsId];
        if (!ts) return null;
        const obj = ts.tiles.entities[instanceId];
        return obj ?? null;
      }
    ),
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
      }
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
      }
    ),
  },
});

const selectTilesets = createSelector.withTypes<RootState>()(
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
        {} as Record<string, Tileset>
      )
);

export const selectors = { ...slice.selectors, selectTilesets };
export const actions = slice.actions;
