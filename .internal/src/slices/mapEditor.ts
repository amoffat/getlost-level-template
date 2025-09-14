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
  // The ids of the objects in the palette, in order. This controls what is
  // actually rendered. This contains ids for single and multi-tile objects.
  paletteIds: string[];
  // All objects in the palette, keyed by id. This will always contain *ALL*
  // single-tiled objects, but multi-tiled objects may be added/removed.
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
            const child = state.palette[toRemove];
            if (child.singleTile) {
              (group.children ??= []).push(child);
            }
          }
        }

        // Remove all overlapping groups (even single-tiled ones) from our list
        // of palette ids.
        state.paletteIds = state.paletteIds.filter((removeCandId) => {
          if (removeIds.has(removeCandId)) {
            const child = state.palette[removeCandId];
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
              delete state.palette[removeCandId];
              tileIndex.remove(groupToBBox(child), (a, b) => a.id === b.id);
            }

            return false;
          }
          return true;
        });

        for (const child of group.children ?? []) {
          addBackChildren.delete(child.id);
        }
        state.paletteIds.push(...Array.from(addBackChildren));
      }

      if (creatingGroup) {
        // If an item with the same id already exists anywhere, ensure it's
        // removed and spatial index updated. The purpose of this is to ensure
        // that the group isn't double-added to the paletteIds and the spatial
        // index. It could probably be simplified.
        if (state.palette[group.id]) {
          const existing = state.palette[group.id];
          tileIndex.remove(groupToBBox(existing), (a, b) => a.id === b.id);
          delete state.palette[group.id];
          state.paletteIds = state.paletteIds.filter((id) => id !== group.id);
        }
        // Now that we're sure we won't double-add it, add the new group
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
