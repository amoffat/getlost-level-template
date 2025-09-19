import { Vector } from "@/vec";
import { createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ActiveLayer } from "../types/layer";
import { TileGroup } from "../types/tilegroup";

type Mode = "pan" | "place" | "select";

interface MapEditorState {
  grid: {
    size: number;
    visible: boolean;
  };
  modeStack: Mode[];
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
    modeStack: [],
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

    placeObject(
      _state,
      _action: PayloadAction<{ obj: TileGroup; pos: Vector }>
    ) {
      // TODO: implement placement logic for obj at pos on the active layer
    },

    pushMode(state, action: PayloadAction<Mode>) {
      if (state.modeStack.at(-1) === action.payload) return;
      state.modeStack.push(action.payload);
    },

    popMode(state) {
      state.modeStack.pop();
    },
  },
  selectors: {
    selectMode: createSelector.withTypes<MapEditorState>()(
      [(state) => state.modeStack],
      (modeStack): Mode | null => modeStack.at(-1) ?? null
    ),
  },
});

export const selectors = slice.selectors;
export const actions = slice.actions;
export default slice.reducer;
