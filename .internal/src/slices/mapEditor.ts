import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ActiveLayer } from "../types/layer";
import { TileGroup } from "../types/tilegroup";

type Mode = null | "pan" | "place";

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
  } as MapEditorState,
  reducers: {
    setActiveLayer(state, action: { payload: ActiveLayer }) {
      state.layers.active = action.payload;
    },
    setDimInactiveLayer(state, action: { payload: boolean }) {
      state.layers.dimInactive = action.payload;
    },
    addSinglePaletteTile(state, action: PayloadAction<TileGroup>) {
      const group = action.payload;
      if (group.id in state.palette) return;
      state.paletteIds.push(group.id);
      state.palette[group.id] = group;
    },

    addPaletteObject(state, action: PayloadAction<TileGroup>) {
      const group = action.payload;
      if (group.id in state.palette) return;

      // Remove any existing groups that overlap with the new one
      const newPaletteIds: string[] = [];
      const newPalette: Record<string, TileGroup> = {};

      for (const objId of state.paletteIds) {
        const existing = state.palette[objId];

        if (existing.objectUrl !== group.objectUrl) {
          newPalette[objId] = existing;
          newPaletteIds.push(objId);
          continue;
        }

        const isOverlapping = !(
          group.pos.br.x <= existing.pos.ul.x ||
          group.pos.ul.x >= existing.pos.br.x ||
          group.pos.br.y <= existing.pos.ul.y ||
          group.pos.ul.y >= existing.pos.br.y
        );
        if (!isOverlapping) {
          newPalette[objId] = existing;
          newPaletteIds.push(objId);
        }
      }

      if (!group.singleTile) {
        newPalette[group.id] = group;
        newPaletteIds.push(group.id);
      }

      state.paletteIds = newPaletteIds;
      state.palette = newPalette;
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
