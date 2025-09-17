import { TileGroup } from "@/types/tilegroup";
import { createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit";
import RBush from "rbush";
import { Rect } from "../types/rect";
import { Tileset } from "../types/tileset";
import { Pan, Zoom, ZoomPan } from "../types/zoompan";

// External, per-tileset spatial index of palette TileGroups.
// Keyed by objectUrl (tileset url). Not part of Redux state.
type BBoxItem = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  id: string;
};
type TileIndex = RBush<BBoxItem>;
const tileIndices: Record<string, TileIndex> = {};

function getTileIndex(id: string): TileIndex {
  if (!tileIndices[id]) {
    tileIndices[id] = new RBush<BBoxItem>();
  }
  return tileIndices[id];
}

// The padding prevents RBush false positives when tiles are adjacent
function groupToBBox(group: TileGroup, pad: number = 0.1): BBoxItem {
  return {
    minX: group.pos.ul.x + pad,
    minY: group.pos.ul.y + pad,
    maxX: group.pos.br.x - pad,
    maxY: group.pos.br.y - pad,
    id: group.id,
  };
}

type Mode = null | "pan" | "group";
export interface TilesetEditorState {
  grid: {
    size: number;
    visible: boolean;
  };
  activeTilesetId: string | null;
  activeZoomPan: ZoomPan;
  tilesetIds: string[];
  tilesets: Record<string, Tileset>;
  mode: Mode;
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
    mode: null,
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
    setMode(state, action: PayloadAction<Mode>) {
      state.mode = action.payload;
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
      const deleting = group.singleTile;
      const creatingGroup = !deleting;

      // Find overlapping groups (same objectUrl via cache) and remove them
      const overlaps = tileIndex.search(bbox);
      if (overlaps.length > 0) {
        const removeIds = new Set(overlaps.map((o) => o.id));
        const addBackChildren: Set<string> = new Set();

        // Create the authoritative list of children for this group. We need
        // this list to be accurate to determine which children of dissolved
        // groups we should add back to the palette.
        if (creatingGroup) {
          for (const [toRemove] of removeIds.entries()) {
            const child = ts.palette[toRemove];
            if (child.singleTile) {
              (group.children ??= []).push(child);
            }
          }
        }

        // Remove all overlapping groups (even single-tiled ones) from our list
        // of palette ids.
        ts.paletteIds = ts.paletteIds.filter((removeCandId) => {
          if (removeIds.has(removeCandId)) {
            const child = ts.palette[removeCandId];
            if (child.singleTile) {
              // If it's a single child, it belongs to our group now.
              if (creatingGroup) {
                // Record all children, so if we dissolve this group later, we
                // can put them back in the palette
                (group.children ??= []).push(child);
              } else {
                // We can't delete a single child.
                return true;
              }
            }
            // If we're disolving a multi-tile group, we want to take its
            // children and add them back to the palette. We'll also re-parent
            // the children to our new group other passes of this filter loop
            // (because they're treated as single tiles).
            else {
              for (const grandChild of child.children ?? []) {
                addBackChildren.add(grandChild.id);
              }
              // Remove the multi-tile group from the palette and spatial index
              delete ts.palette[removeCandId];
              tileIndex.remove(groupToBBox(child), (a, b) => a.id === b.id);
            }

            return false;
          }
          return true;
        });

        for (const child of group.children ?? []) {
          addBackChildren.delete(child.id);
        }
        ts.paletteIds.push(...Array.from(addBackChildren));
      }

      if (creatingGroup) {
        // If an item with the same id already exists anywhere, ensure it's
        // removed and spatial index updated. The purpose of this is to ensure
        // that the group isn't double-added to the paletteIds and the spatial
        // index. It could probably be simplified.
        if (ts.palette[group.id]) {
          const existing = ts.palette[group.id];
          tileIndex.remove(groupToBBox(existing), (a, b) => a.id === b.id);
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
        return ts.paletteIds.map((id) => ts.palette[id]);
      }
    ),
  },
});

export const selectors = slice.selectors;
export const actions = slice.actions;
export default slice.reducer;
