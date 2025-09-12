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
  layers: {
    active: ActiveLayer;
    dimInactive: boolean;
  };
  palette: TileGroup[];
}

const slice = createSlice({
  name: "mapEditor",
  initialState: {
    grid: {
      size: 16,
      visible: true,
    },
    mode: null,
    layers: {
      active: "ground",
      dimInactive: true,
    },
    palette: [],
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
      state.palette.push(group);
    },

    addPaletteObject(state, action: PayloadAction<TileGroup>) {
      const group = action.payload;

      // Remove any existing groups that overlap with the new one
      const newPalette: TileGroup[] = [];
      for (const existing of state.palette) {
        if (existing.objectUrl !== group.objectUrl) {
          newPalette.push(existing);
          continue;
        }

        const isOverlapping = !(
          group.pos.br.x <= existing.pos.ul.x ||
          group.pos.ul.x >= existing.pos.br.x ||
          group.pos.br.y <= existing.pos.ul.y ||
          group.pos.ul.y >= existing.pos.br.y
        );
        if (!isOverlapping) {
          newPalette.push(existing);
        }
      }

      if (!group.singleTile) {
        newPalette.push(group);
      }
      state.palette = newPalette;
    },
  },
  selectors: {
    selectTilesetGroups: (state, tileset: string | null) =>
      state.palette.filter((g) => g.objectUrl === tileset),
  },
});

export const selectors = slice.selectors;
export const actions = slice.actions;
export default slice.reducer;
