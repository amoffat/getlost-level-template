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
  } as MapEditorState,
  reducers: {
    setActiveLayer(state, action: { payload: ActiveLayer }) {
      state.layers.active = action.payload;
    },

    setDimInactiveLayer(state, action: { payload: boolean }) {
      state.layers.dimInactive = action.payload;
    },

    setPlace(state, action: PayloadAction<TileGroup | null>) {
      state.place = action.payload;
    },
  },
});

export const selectors = slice.selectors;
export const actions = slice.actions;
export default slice.reducer;
