import { Mode, TileGroupInstance } from "@/types/editor";
import { Vector } from "@/vec";
import {
  createEntityAdapter,
  createSelector,
  createSlice,
  EntityState,
  PayloadAction,
} from "@reduxjs/toolkit";
import { ActiveLayer } from "../types/layer";
import { TileGroup } from "../types/tilegroup";

const selectedAdapter = createEntityAdapter<TileGroupInstance>();

interface MapEditorState {
  grid: {
    size: number;
    visible: boolean;
    snap: boolean;
  };
  modeStack: Mode[];
  place: TileGroup | null;
  selectedObjs: EntityState<TileGroupInstance, string>;
  proposedSelection: {
    objects: TileGroupInstance[];
    pos: Vector;
  } | null;
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
    selectedObjs: selectedAdapter.getInitialState(),
    proposedSelection: null,
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

    setOneSelected: (state, action: PayloadAction<TileGroupInstance>) => {
      selectedAdapter.removeAll(state.selectedObjs);
      selectedAdapter.setOne(state.selectedObjs, action.payload);
    },

    addOneSelected: (state, action: PayloadAction<TileGroupInstance>) => {
      selectedAdapter.setOne(state.selectedObjs, action.payload);
    },

    setManySelected: (state, action: PayloadAction<TileGroupInstance[]>) => {
      selectedAdapter.removeAll(state.selectedObjs);
      selectedAdapter.setMany(state.selectedObjs, action.payload);
    },

    addManySelected: (state, action: PayloadAction<TileGroupInstance[]>) => {
      selectedAdapter.setMany(state.selectedObjs, action.payload);
    },

    removeOneSelected: (state, action: PayloadAction<TileGroupInstance>) => {
      selectedAdapter.removeOne(state.selectedObjs, action.payload.id);
    },

    clearSelection: (state) => {
      selectedAdapter.removeAll(state.selectedObjs);
    },

    setProposedSelection(
      state,
      action: PayloadAction<MapEditorState["proposedSelection"]>
    ) {
      state.proposedSelection = action.payload;
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
      (modeStack): Mode => modeStack.at(-1) ?? "select"
    ),
  },
});

export const selectors = slice.selectors;
export const actions = slice.actions;
export default slice.reducer;
