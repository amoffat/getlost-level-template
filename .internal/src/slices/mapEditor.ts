import { Mode, TileGroupInstance } from "@/types/editor";
import { ZoomPan } from "@/types/zoompan";
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

export const selectedAdapter = createEntityAdapter<TileGroupInstance>();

interface MapEditorState {
  grid: {
    size: number;
    visible: boolean;
    snap: boolean;
  };
  zoomPan: ZoomPan;
  selectedMode: Mode | null;
  modeStack: Mode[];
  place: {
    obj: TileGroup | null;
    flipX: boolean;
  };
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

const tgiSelectors = selectedAdapter.getSelectors(
  (state: MapEditorState) => state.selectedObjs
);

const slice = createSlice({
  name: "mapEditor",
  initialState: {
    grid: {
      size: 16,
      visible: true,
      snap: true,
    },
    zoomPan: { zoom: 1, pan: { x: 0, y: 0 } },
    place: {
      obj: null,
      flipX: false,
    },
    selectedObjs: selectedAdapter.getInitialState(),
    proposedSelection: null,
    selectedMode: null,
    modeStack: [],
    layers: {
      active: "ground",
      dimInactive: true,
    },
  } as MapEditorState,
  reducers: {
    setZoomPan(state, action: PayloadAction<ZoomPan>) {
      state.zoomPan = action.payload;
    },

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
      state.place.obj = action.payload;
    },

    toggleFlipX(state) {
      state.place.flipX = !state.place.flipX;
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

    updateManySelected: (
      state,
      action: PayloadAction<
        { id: string; changes: Partial<TileGroupInstance> }[]
      >
    ) => {
      selectedAdapter.updateMany(state.selectedObjs, action.payload);
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
        state.place.obj = null;
        state.place.flipX = false;
      }
      state.modeStack = [mode];
    },

    setActiveTool(state, action: PayloadAction<Mode | null>) {
      const mode = action.payload;
      state.selectedMode = mode;
    },
  },
  selectors: {
    selectMode: createSelector.withTypes<MapEditorState>()(
      [(state) => state.modeStack],
      (modeStack): Mode => modeStack.at(-1) ?? "select"
    ),
  },
});

export const selectors = {
  ...slice.selectors,
  selection: tgiSelectors,
};
export const actions = slice.actions;
export default slice.reducer;
