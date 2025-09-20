import { Mode } from "@/types/editor";
import { createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ActiveLayer } from "../types/layer";
import { TileGroup } from "../types/tilegroup";

interface MapEditorState {
  grid: {
    size: number;
    visible: boolean;
    snap: boolean;
  };
  modeStack: Mode[];
  place: TileGroup | null;
  selectedObjs: string[];
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
      snap: true,
    },
    place: null,
    selectedObjs: [],
    modeStack: [],
    layers: {
      active: "ground",
      dimInactive: true,
    },
  } as MapEditorState,
  reducers: {
    setGridSnap(state, action: { payload: boolean }) {
      state.grid.snap = action.payload;
    },

    setActiveLayer(state, action: { payload: ActiveLayer }) {
      state.layers.active = action.payload;
    },

    setDimInactiveLayer(state, action: { payload: boolean }) {
      state.layers.dimInactive = action.payload;
    },

    setPlace(state, action: PayloadAction<TileGroup | null>) {
      state.place = action.payload;
    },

    selectObj: (state, action: PayloadAction<string[] | null>) => {
      state.selectedObjs = action.payload ?? [];
    },

    pushMode(state, action: PayloadAction<Mode>) {
      if (state.modeStack.at(-1) === action.payload) return;
      state.modeStack.push(action.payload);
    },

    popMode(state) {
      state.modeStack.pop();
    },

    setMode(state, action: PayloadAction<Mode>) {
      const mode = action.payload;
      if (mode === "select") {
        state.place = null;
      }
      state.modeStack = [mode];
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
