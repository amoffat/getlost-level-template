import { log } from "@/log";
import { TileGroupInstance } from "@/types/editor";
import { Rect } from "@/types/rect";
import { IndexItem, SpatialIndex } from "@/types/spatial";
import { TileGroup } from "@/types/tilegroup";
import { Mode, Tileset } from "@/types/tileset";
import { Pan, Zoom, ZoomPan } from "@/types/zoompan";
import { createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit";

const tileIndices: Record<string, SpatialIndex> = {};

export function getTileIndex(id: string): SpatialIndex {
  if (!tileIndices[id]) {
    tileIndices[id] = new SpatialIndex();
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

export interface TilesetEditorState {
  grid: {
    size: number;
    visible: boolean;
  };
  activeTilesetId: string | null;
  activeZoomPan: ZoomPan;
  tilesetIds: string[];
  tilesets: Record<string, Tileset>;
  modeStack: Mode[];
  scanPos: Rect | null;
  tilesetZoomPans: Record<string, ZoomPan>;
  loadingPalette: boolean;
}

const slice = createSlice({
  name: "tilesetEditor",
  initialState: {
    grid: {
      size: 16,
      visible: true,
    },
    activeTilesetId: null,
    activeZoomPan: { zoom: 1, pan: { x: 0, y: 0 } },
    tilesetIds: [],
    tilesets: {},
    modeStack: [],
    scanPos: null,
    tilesetZoomPans: {},
    loadingPalette: false,
  } as TilesetEditorState,
  reducers: {
    setGridVisible(state, action: PayloadAction<boolean>) {
      state.grid.visible = action.payload;
    },
    setGridSize(state, action: PayloadAction<number>) {
      state.grid.size = action.payload;
    },
    pushMode(state, action: PayloadAction<Mode>) {
      if (state.modeStack.at(-1) === action.payload) return;
      state.modeStack.push(action.payload);
    },
    popMode(state) {
      state.modeStack.pop();
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

    setMode(state, action: PayloadAction<Mode>) {
      state.modeStack = [action.payload];
    },
    setActiveTileset: (state, action: PayloadAction<Tileset>) => {
      const ts = action.payload;
      state.activeTilesetId = ts.id;
      state.activeZoomPan = state.tilesetZoomPans[ts.id];
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
      state.tilesetZoomPans[ts.id] ??= { zoom: 1, pan: { x: 0, y: 0 } };
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
        state.activeZoomPan = { zoom: 1, pan: { x: 0, y: 0 } };
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
      if (!tsId) return;
      state.tilesetZoomPans[tsId].zoom = zoom;
    },
    setPan: (state, action: PayloadAction<Pan>) => {
      const pan = action.payload;
      const tsId = state.activeTilesetId;
      if (!tsId) return;
      state.tilesetZoomPans[tsId].pan = pan;
    },
    loadingPalette(state, action: PayloadAction<boolean>) {
      state.loadingPalette = action.payload;
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
          if (obj.singleTile && !obj.pinned) {
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

    addPaletteObject(
      state,
      action: PayloadAction<{ tsId: string; group: TileGroup }>
    ) {
      const { tsId, group } = action.payload;
      const ts = state.tilesets[tsId];
      const tileIndex = getTileIndex(ts.id);
      const bbox = groupToBBox(group);
      const overlaps = tileIndex.search(bbox);

      let isOverlappingSelf = false;
      if (overlaps.length === 1) {
        isOverlappingSelf = overlaps[0].id === group.id;
      }

      const deleting = group.singleTile && !isOverlappingSelf;
      const creatingGroup = !deleting;
      const replaceMode = state.modeStack.at(-1) === "group";
      const curGridSize = state.grid.size;

      // Find overlapping groups (same objectUrl via cache) and remove them
      if (overlaps.length > 0 && replaceMode) {
        const removeIds = new Set(overlaps.map((o) => o.id));
        const addBackChildrenIds: Set<string> = new Set();
        const groupChildrenIds: Set<string> = new Set();

        // Create the authoritative list of children for this group. We need
        // this list to be accurate to determine which children of dissolved
        // groups we should add back to the palette.
        if (creatingGroup) {
          for (const [toRemove] of removeIds.entries()) {
            const child = ts.palette[toRemove];
            if (child.singleTile) {
              groupChildrenIds.add(child.id);
            }
          }
        }

        // Remove all overlapping groups (even single-tiled ones) from our list
        // of palette ids.
        ts.paletteIds = ts.paletteIds.filter((removeCandId) => {
          if (removeIds.has(removeCandId)) {
            const child = ts.palette[removeCandId];

            // We can't delete a single tile object, so make sure it isn't
            // filtered out of the paletteIds.
            if (child.singleTile) {
              const sameGridSize = child.gridSize === curGridSize;
              if (!creatingGroup && sameGridSize) {
                return true;
              }
            }
            // If we're disolving a multi-tile group, we want to take its
            // children and add them back to the palette. We'll also re-parent
            // the children to our new group other passes of this filter loop
            // (because they're treated as single tiles).
            else {
              for (const grandChildId of child.children) {
                addBackChildrenIds.add(grandChildId);
              }
            }

            // Remove the multi-tile group from the palette and spatial index
            if (!child.singleTile) {
              delete ts.palette[removeCandId];
            }
            tileIndex.removeById(removeCandId);
            return false;
          }
          return true;
        });

        // We don't want to add children back to the palette if they are
        // becoming part of our new group.
        for (const childId of groupChildrenIds.values()) {
          addBackChildrenIds.delete(childId);
        }
        ts.paletteIds.push(...Array.from(addBackChildrenIds));

        group.children = Array.from(groupChildrenIds);
      }

      if (creatingGroup) {
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
      }
    },
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
      [(state) => state.modeStack],
      (modeStack): Mode => modeStack.at(-1) ?? "select"
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
export default slice.reducer;
