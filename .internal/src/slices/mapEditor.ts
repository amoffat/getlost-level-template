import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import RBush from "rbush";
import { ActiveLayer } from "../types/layer";
import { TileGroup } from "../types/tilegroup";

type Mode = null | "pan" | "place";

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

function getTileIndex(objectUrl: string): TileIndex {
  if (!tileIndices[objectUrl]) {
    tileIndices[objectUrl] = new RBush<BBoxItem>();
  }
  return tileIndices[objectUrl];
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

interface MapEditorState {
  grid: {
    size: number;
    visible: boolean;
  };
  mode: Mode;
  place: TileGroup | null;
  layers: {
    active: ActiveLayer;
    dimInactive: boolean;
  };
  paletteIds: string[];
  palette: Record<string, TileGroup>;
  loadingPalette: boolean;
}

const slice = createSlice({
  name: "mapEditor",
  initialState: {
    grid: {
      size: 16,
      visible: true,
    },
    place: null,
    mode: null,
    layers: {
      active: "ground",
      dimInactive: true,
    },
    paletteIds: [],
    palette: {},
    loadingPalette: false,
  } as MapEditorState,
  reducers: {
    setActiveLayer(state, action: { payload: ActiveLayer }) {
      state.layers.active = action.payload;
    },

    setDimInactiveLayer(state, action: { payload: boolean }) {
      state.layers.dimInactive = action.payload;
    },

    loadingPalette(state, action: PayloadAction<boolean>) {
      state.loadingPalette = action.payload;
    },

    bulkAddSinglePaletteTiles(state, action: PayloadAction<TileGroup[]>) {
      const groups = action.payload;
      const newPaletteIds: string[] = [];
      const newPalette: Record<string, TileGroup> = { ...state.palette };

      for (const group of groups) {
        if (group.id in newPalette) continue;
        newPaletteIds.push(group.id);
        newPalette[group.id] = group;
        // Keep external cache in sync
        getTileIndex(group.objectUrl).insert(groupToBBox(group));
      }

      state.paletteIds = [...state.paletteIds, ...newPaletteIds];
      state.palette = newPalette;
    },

    addSinglePaletteTile(state, action: PayloadAction<TileGroup>) {
      const group = action.payload;
      if (group.id in state.palette) return;
      state.paletteIds.push(group.id);
      state.palette[group.id] = group;
      // Keep external cache in sync
      getTileIndex(group.objectUrl).insert(groupToBBox(group));
    },

    addPaletteObject(state, action: PayloadAction<TileGroup>) {
      const group = action.payload;
      const tileset = group.objectUrl;
      const tileIndex = getTileIndex(tileset);
      const bbox = groupToBBox(group);

      // Find overlapping groups (same objectUrl via cache) and remove them
      const overlaps = tileIndex.search(bbox);
      if (overlaps.length > 0) {
        const removeIds = new Set(overlaps.map((o) => o.id));
        // Remove from state lists
        state.paletteIds = state.paletteIds.filter((id) => {
          if (removeIds.has(id)) {
            // Also drop from palette map
            delete state.palette[id];
            return false;
          }
          return true;
        });
        // Remove from cache
        for (const item of overlaps) {
          tileIndex.remove(item, (a, b) => a.id === b.id);
        }
      }

      // If an item with the same id already exists anywhere, ensure it's
      // removed and cache updated
      if (state.palette[group.id]) {
        const existing = state.palette[group.id];
        tileIndex.remove(groupToBBox(existing), (a, b) => a.id === b.id);
        delete state.palette[group.id];
        state.paletteIds = state.paletteIds.filter((id) => id !== group.id);
      }

      // Add the new group unless it's meant to be a "deleting" single tile
      if (!group.singleTile) {
        state.paletteIds.push(group.id);
        state.palette[group.id] = group;
        tileIndex.insert(bbox);
      }
    },

    setPlace(state, action: PayloadAction<TileGroup | null>) {
      state.place = action.payload;
    },
  },

  selectors: {
    selectTilesetGroups: (state, tileset: string | null) =>
      state.paletteIds.filter(
        (objId) => state.palette[objId].objectUrl === tileset
      ),
  },
});

export const selectors = slice.selectors;
export const actions = slice.actions;
export default slice.reducer;
