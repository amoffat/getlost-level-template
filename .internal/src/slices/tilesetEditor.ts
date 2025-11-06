import { log } from "@/log";
import { AnimationTemplate, isAnimationTemplate } from "@/types/animation";
import { isNpcTemplate, NpcTemplate } from "@/types/npc";
import { Rect } from "@/types/rect";
import { isTileGroupTemplate, TileGroupTemplate } from "@/types/tilegroup";
import { Mode, Tileset } from "@/types/tileset";
import { TilesetObjectTemplate } from "@/types/tilesetobject";
import { Pan, Zoom, ZoomPan } from "@/types/zoompan";
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

const reconcilePrefix = "tilesetEditor";
export const selectedAdapter = createEntityAdapter<TilesetObjectTemplate>();
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
  selectedTiles: EntityState<TilesetObjectTemplate, string>;
  toolOptions: {
    [K in ToolWithOptions]: ToolOptMapping[K];
  };
  candAnimFrames: TileGroupTemplate[];
  // obj id to tileset id
  fastObjLookup: Record<string, string>;
}

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
    candAnimFrames: [],
    fastObjLookup: {},
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
      state.candAnimFrames.push(action.payload);
    },

    removeCandAnimIdx(state, action: PayloadAction<number>) {
      const idx = action.payload;
      state.candAnimFrames.splice(idx, 1);
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
          state.fastObjLookup[obj.id] = ts.id;
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
      for (const id of Object.keys(state.fastObjLookup)) {
        if (state.fastObjLookup[id] === tsId) {
          delete state.fastObjLookup[id];
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

    markSaved(state, action: PayloadAction<{ tsId: string; saved: boolean }>) {
      const { tsId, saved } = action.payload;
      const ts = state.tilesets[tsId];
      ts.saved = saved;
    },

    bulkAddSinglePaletteTiles: {
      prepare: (payload: {
        tsId: string;
        groups: TilesetObjectTemplate[];
      }) => ({
        meta: {
          reconcilePrefix,
          reconcileType: "add" as const,
          reconcile: payload.groups,
        },
        payload,
      }),
      reducer(
        state,
        action: PayloadAction<{ tsId: string; groups: TilesetObjectTemplate[] }>
      ) {
        const { tsId, groups } = action.payload;
        const ts = state.tilesets[tsId];
        tileAdapter.addMany(ts.tiles, groups);
        for (const group of groups) {
          state.fastObjLookup[group.id] = tsId;
        }
      },
    },

    addPaletteObject: {
      prepare: (payload: { tsId: string; group: TilesetObjectTemplate }) => ({
        meta: {
          reconcilePrefix,
          reconcileType: "add" as const,
          reconcile: payload.group,
        },
        payload,
      }),
      reducer(
        state,
        action: PayloadAction<{ tsId: string; group: TilesetObjectTemplate }>
      ) {
        const { tsId, group } = action.payload;
        const ts = state.tilesets[tsId];
        tileAdapter.addOne(ts.tiles, group);
        state.fastObjLookup[group.id] = tsId;
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
        tileAdapter.removeMany(ts.tiles, ids);
        for (const id of ids) {
          delete state.fastObjLookup[id];
        }
      },
    },

    setOneSelected: (state, action: PayloadAction<TilesetObjectTemplate>) => {
      selectedAdapter.removeAll(state.selectedTiles);
      selectedAdapter.setOne(state.selectedTiles, action.payload);
    },

    addOneSelected: (state, action: PayloadAction<TilesetObjectTemplate>) => {
      selectedAdapter.setOne(state.selectedTiles, action.payload);
    },

    setManySelected: (
      state,
      action: PayloadAction<TilesetObjectTemplate[]>
    ) => {
      selectedAdapter.removeAll(state.selectedTiles);
      selectedAdapter.setMany(state.selectedTiles, action.payload);
    },

    addManySelected: (
      state,
      action: PayloadAction<TilesetObjectTemplate[]>
    ) => {
      selectedAdapter.setMany(state.selectedTiles, action.payload);
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
    selectTilesets: createTsSelector(
      [(state) => state.tilesetIds, (state) => state.tilesets],
      (tilesetIds, tilesets): Tileset[] => tilesetIds.map((id) => tilesets[id])
    ),
    selectTileset: createTsSelector(
      [(state, tsId: string) => state.tilesets[tsId]],
      (ts): Tileset | null => (ts ? ts : null)
    ),
    activeTileset: createTsSelector(
      [(state) => state.activeTilesetId, (state) => state.tilesets],
      (tsId, tilesets): Tileset | null =>
        tsId ? (tilesets[tsId] ?? null) : null
    ),
    activeTilesetGroups: createTsSelector(
      [(state) => state.activeTilesetId, (state) => state.tilesets],
      (tsId, tilesets): TileGroupTemplate[] => {
        if (!tsId) return [];
        const ts = tilesets[tsId];
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
    selectedTiles: createTsSelector(
      [(state) => state.selectedTiles],
      (tiles): TilesetObjectTemplate[] =>
        tiles.ids.map((id) => tiles.entities[id])
    ),
    templateFromInstanceId: createTsSelector(
      [
        (state) => state.tilesets,
        (state) => state.fastObjLookup,
        (_, instanceId: string) => instanceId,
      ],
      (
        tilesets: Record<string, Tileset>,
        fastObjLookup: Record<string, string>,
        instanceId: string
      ): TilesetObjectTemplate | null => {
        const tsId = fastObjLookup[instanceId];
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

export const selectors = slice.selectors;
export const actions = slice.actions;
