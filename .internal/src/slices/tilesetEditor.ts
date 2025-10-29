import { log } from "@/log";
import { Rect } from "@/types/rect";
import { isTileGroup, TileGroup, TilesetObject } from "@/types/tilegroup";
import { Mode, Tileset } from "@/types/tileset";
import { Pan, Zoom, ZoomPan } from "@/types/zoompan";
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
export const selectedAdapter = createEntityAdapter<TilesetObject>();
export const tileAdapter = createEntityAdapter<TilesetObject>();

export interface TilesetEditorState {
  grid: {
    size: number;
    visible: boolean;
  };
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
  selectedTiles: EntityState<TilesetObject, string>;
  toolOptions: {
    [K in ToolWithOptions]: ToolOptMapping[K];
  };
  candAnimFrames: TileGroup[];
}

export const slice = createSlice({
  name: "tilesetEditor",
  initialState: {
    grid: {
      size: 16,
      visible: true,
    },
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

    addCandAnimFrame(state, action: PayloadAction<TileGroup>) {
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
        obj: TilesetObject;
        changes: Partial<TilesetObject>;
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
          obj: TilesetObject;
          changes: Partial<TilesetObject>;
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
        state.activeZoomPan = ts
          ? state.tilesetZoomPans[ts.id]
          : DEFAULT_ZOOMPAN;

        if (ts) {
          // tileAdapter.setAll(ts?.tiles, Object.values(ts.tiles.entities));
        }
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
      state.tilesetZoomPans[ts.id] ??= DEFAULT_ZOOMPAN;
      if (!state.tilesetIds.includes(ts.id)) {
        state.tilesetIds.push(ts.id);
      }
    },

    removeTileset: (state, action: PayloadAction<string>) => {
      const tsId = action.payload;
      delete state.tilesets[tsId];
      state.tilesetIds = state.tilesetIds.filter((id) => id !== tsId);
      if (state.activeTilesetId === tsId) {
        state.activeTilesetId = null;
        state.activeZoomPan = DEFAULT_ZOOMPAN;
      }
      delete state.tilesetZoomPans[tsId];
    },

    setScanPos: (state, action: PayloadAction<Rect | null>) => {
      state.scanPos = action.payload;
    },
    setZoom: (state, action: PayloadAction<Zoom>) => {
      const zoom = action.payload;
      const tsId = state.activeTilesetId;
      state.activeZoomPan.zoom = zoom;
      if (!tsId) return;
      state.tilesetZoomPans[tsId].zoom = zoom;
    },
    setPan: (state, action: PayloadAction<Pan>) => {
      const pan = action.payload;
      const tsId = state.activeTilesetId;
      state.activeZoomPan.pan = pan;
      if (!tsId) return;
      state.tilesetZoomPans[tsId].pan = pan;
    },

    markSaved(state, action: PayloadAction<{ tsId: string; saved: boolean }>) {
      const { tsId, saved } = action.payload;
      const ts = state.tilesets[tsId];
      ts.saved = saved;
    },

    bulkAddSinglePaletteTiles: {
      prepare: (payload: { tsId: string; groups: TilesetObject[] }) => ({
        meta: {
          reconcilePrefix,
          reconcileType: "add" as const,
          reconcile: payload.groups,
        },
        payload,
      }),
      reducer(
        state,
        action: PayloadAction<{ tsId: string; groups: TilesetObject[] }>
      ) {
        const { tsId, groups } = action.payload;
        const ts = state.tilesets[tsId];
        tileAdapter.addMany(ts.tiles, groups);
      },
    },

    addPaletteObject: {
      prepare: (payload: { tsId: string; group: TilesetObject }) => ({
        meta: {
          reconcilePrefix,
          reconcileType: "add" as const,
          reconcile: payload.group,
        },
        payload,
      }),
      reducer(
        state,
        action: PayloadAction<{ tsId: string; group: TilesetObject }>
      ) {
        const { tsId, group } = action.payload;
        const ts = state.tilesets[tsId];
        tileAdapter.addOne(ts.tiles, group);
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
      },
    },

    setOneSelected: (state, action: PayloadAction<TilesetObject>) => {
      selectedAdapter.removeAll(state.selectedTiles);
      selectedAdapter.setOne(state.selectedTiles, action.payload);
    },

    addOneSelected: (state, action: PayloadAction<TilesetObject>) => {
      selectedAdapter.setOne(state.selectedTiles, action.payload);
    },

    setManySelected: (state, action: PayloadAction<TilesetObject[]>) => {
      selectedAdapter.removeAll(state.selectedTiles);
      selectedAdapter.setMany(state.selectedTiles, action.payload);
    },

    addManySelected: (state, action: PayloadAction<TilesetObject[]>) => {
      selectedAdapter.setMany(state.selectedTiles, action.payload);
    },

    updateManySelected: (
      state,
      action: PayloadAction<{ id: string; changes: Partial<TilesetObject> }[]>
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
    selectTilesets: createSelector.withTypes<TilesetEditorState>()(
      [(state) => state.tilesetIds, (state) => state.tilesets],
      (tilesetIds, tilesets): Tileset[] => tilesetIds.map((id) => tilesets[id])
    ),
    activeTileset: createSelector.withTypes<TilesetEditorState>()(
      [(state) => state.activeTilesetId, (state) => state.tilesets],
      (tsId, tilesets): Tileset | null =>
        tsId ? (tilesets[tsId] ?? null) : null
    ),
    activeTilesetGroups: createSelector.withTypes<TilesetEditorState>()(
      [(state) => state.activeTilesetId, (state) => state.tilesets],
      (tsId, tilesets): TileGroup[] => {
        if (!tsId) return [];
        const ts = tilesets[tsId];
        const objs = ts.tiles.ids
          .map((id) => ts.tiles.entities[id])
          .filter(isTileGroup);
        const broken = ts.tiles.ids.filter(
          (id) => ts.tiles.entities[id] === undefined
        );
        if (broken.length) {
          log.warn({ broken }, "Broken tile ids detected");
        }
        return objs;
      }
    ),
    selectMode: createSelector.withTypes<TilesetEditorState>()(
      [(state) => state.activeModeStack],
      (activeModeStack): Mode => activeModeStack.at(-1) ?? "select"
    ),
    paletteSelectedIds: createSelector.withTypes<TilesetEditorState>()(
      [(state) => state.selectedTiles.ids],
      (selectedIds): Set<string> => new Set(selectedIds as string[])
    ),
    selectedTiles: createSelector.withTypes<TilesetEditorState>()(
      [(state) => state.selectedTiles],
      (tiles): TilesetObject[] => tiles.ids.map((id) => tiles.entities[id])
    ),
  },
});

export const selectors = slice.selectors;
export const actions = slice.actions;
