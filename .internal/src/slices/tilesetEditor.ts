import { log } from "@/log";
import { TileGroupInstance } from "@/types/map";
import { Rect } from "@/types/rect";
import { IndexItem, SpatialIndex } from "@/types/spatial";
import { TileGroup } from "@/types/tilegroup";
import { Mode, Tileset } from "@/types/tileset";
import { Pan, Zoom, ZoomPan } from "@/types/zoompan";
import {
  createEntityAdapter,
  createSelector,
  createSlice,
  EntityState,
  PayloadAction,
} from "@reduxjs/toolkit";

const tileIndices: Record<string, SpatialIndex> = {};
const DEFAULT_ZOOMPAN: ZoomPan = { zoom: 1, pan: { x: 0, y: 0 } };

export function getTileIndex(id: string): SpatialIndex {
  if (!tileIndices[id]) {
    tileIndices[id] = new SpatialIndex({
      selectById: (_state, _id) => undefined, // Not needed
      filterLayer: () => true, // Not needed
    });
  }
  return tileIndices[id];
}

// The padding prevents RBush false positives when tiles are adjacent
export function groupToBBox(group: TileGroup, pad: number = 0.1): IndexItem {
  return {
    minX: group.pos.ul.x + pad,
    minY: group.pos.ul.y + pad,
    maxX: group.pos.br.x - pad,
    maxY: group.pos.br.y - pad,
    id: group.id,
  };
}

export const selectedAdapter = createEntityAdapter<TileGroup>();

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
  selectedTiles: EntityState<TileGroup, string>;
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

    pushMode(state, action: PayloadAction<Mode>) {
      if (state.activeModeStack.at(-1) === action.payload) return;
      state.activeModeStack.push(action.payload);
    },
    popMode(state) {
      state.activeModeStack.pop();
    },

    updateTileGroup(
      state,
      action: PayloadAction<{
        tsId: string;
        group: TileGroup;
        changes: Partial<TileGroup>;
      }>
    ) {
      const { group, changes } = action.payload;
      const ts = state.tilesets[group.tilesetId];
      if (!ts || !ts.palette[group.id]) return;

      const tg = ts.palette[group.id];
      const changed = { ...tg, ...changes };
      ts.palette[group.id] = changed;

      const spatialIdx = getTileIndex(ts.id);
      spatialIdx.removeById(group.id);
      spatialIdx.insert(groupToBBox(ts.palette[group.id]));
    },

    setMode(state, action: PayloadAction<Mode | null>) {
      const mode = action.payload;
      state.activeModeStack = mode === null ? [] : [mode];
    },
    setActiveTileset: (state, action: PayloadAction<Tileset | null>) => {
      const ts = action.payload;
      state.activeTilesetId = ts?.id ?? null;
      state.activeZoomPan = ts ? state.tilesetZoomPans[ts.id] : DEFAULT_ZOOMPAN;
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

      const idx = getTileIndex(ts.id);
      for (const group of Object.values(ts.palette)) {
        idx.insert(groupToBBox(group));
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
      delete tileIndices[tsId];
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
      if (ts) {
        ts.saved = saved;
      }
    },

    clearPalette(state, action: PayloadAction<string>) {
      const tsId = action.payload;
      const ts = state.tilesets[tsId];
      if (ts) {
        const idsToDelete = new Set<string>();
        const spatialIdx = getTileIndex(ts.id);
        for (const obj of Object.values(ts.palette)) {
          // Single tile objects can be deleted outright
          if (!obj.pinned) {
            delete ts.palette[obj.id];
            idsToDelete.add(obj.id);
            spatialIdx.removeById(obj.id);
          }
        }
        ts.paletteIds = ts.paletteIds.filter((id) => !idsToDelete.has(id));
      }
    },

    bulkAddSinglePaletteTiles(
      state,
      action: PayloadAction<{ tsId: string; groups: TileGroup[] }>
    ) {
      const { tsId, groups } = action.payload;
      const ts = state.tilesets[tsId];
      const newPaletteIds: string[] = [];
      const newPalette: Record<string, TileGroup> = { ...ts.palette };
      const idx = getTileIndex(ts.id);

      for (const group of groups) {
        if (group.id in newPalette) continue;
        newPaletteIds.push(group.id);
        newPalette[group.id] = group;
        // Keep external cache in sync
        idx.insert(groupToBBox(group));
      }

      ts.paletteIds = [...ts.paletteIds, ...newPaletteIds];
      ts.palette = newPalette;
    },

    addSinglePaletteTile(
      state,
      action: PayloadAction<{ tsId: string; group: TileGroup }>
    ) {
      const { tsId, group } = action.payload;
      const ts = state.tilesets[tsId];
      if (group.id in ts.palette) return;
      ts.paletteIds.push(group.id);
      ts.palette[group.id] = group;
      // Keep external cache in sync
      getTileIndex(ts.id).insert(groupToBBox(group));
    },

    deletePaletteObject(
      state,
      action: PayloadAction<{ tsId: string; coords: Rect }>
    ) {
      const { tsId, coords } = action.payload;
      const ts = state.tilesets[tsId];
      if (!ts) return;

      const bbox = {
        minX: coords.ul.x,
        minY: coords.ul.y,
        maxX: coords.br.x,
        maxY: coords.br.y,
      };

      const overlaps = getTileIndex(ts.id).search(bbox);
      for (const item of overlaps) {
        delete ts.palette[item.id];
        ts.paletteIds = ts.paletteIds.filter((pid) => pid !== item.id);
      }
    },

    addPaletteObject(
      state,
      action: PayloadAction<{ tsId: string; group: TileGroup }>
    ) {
      const { tsId, group } = action.payload;
      const ts = state.tilesets[tsId];
      const tileIndex = getTileIndex(ts.id);
      const bbox = groupToBBox(group);

      // If an item with the same id already exists anywhere, ensure it's
      // removed and spatial index updated. The purpose of this is to ensure
      // that the group isn't double-added to the paletteIds and the spatial
      // index. It could probably be simplified.
      if (ts.palette[group.id]) {
        tileIndex.removeById(group.id);
        delete ts.palette[group.id];
        ts.paletteIds = ts.paletteIds.filter((id) => id !== group.id);
      }
      // Now that we're sure we won't double-add it, add the new group
      ts.paletteIds.push(group.id);
      ts.palette[group.id] = group;
      tileIndex.insert(bbox);
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
        const objs = ts.paletteIds.map((id) => ts.palette[id]);
        const broken = ts.paletteIds.filter(
          (id) => ts.palette[id] === undefined
        );
        if (broken.length) {
          log.warn({ broken }, "Broken palette ids detected");
        }
        return objs;
      }
    ),
    selectMode: createSelector.withTypes<TilesetEditorState>()(
      [(state) => state.activeModeStack],
      (activeModeStack): Mode => activeModeStack.at(-1) ?? "select"
    ),
    selectTileGroupByInstanceId: createSelector.withTypes<TilesetEditorState>()(
      [(state) => state.tilesets, (_, inst: TileGroupInstance) => inst],
      (tilesets, inst): TileGroup => {
        return tilesets[inst.tilesetId].palette[inst.tileId];
      }
    ),
  },
});

export const selectors = slice.selectors;
export const actions = slice.actions;
