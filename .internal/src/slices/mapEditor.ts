import { Mode } from "@/types/editor";
import { MapLayerName } from "@/types/layer";
import { MapObj } from "@/types/map";
import { Rect } from "@/types/rect";
import { TileGroup } from "@/types/tilegroup";
import { ColliderOpts, MagicPaintOpts, PaintOpts } from "@/types/tools";
import { ZoomPan } from "@/types/zoompan";
import { Vector } from "@/vec";
import {
  createEntityAdapter,
  createSelector,
  createSlice,
  EntityState,
  PayloadAction,
} from "@reduxjs/toolkit";

export const selectedAdapter = createEntityAdapter<MapObj>();

type ToolOptMapping = {
  paint: PaintOpts;
  "magic-paint": MagicPaintOpts;
  "add-collider": ColliderOpts;
};

// Derive the tool names with options directly from the mapping type.
type ToolWithOptions = keyof ToolOptMapping;

interface MapEditorState {
  grid: {
    size: number;
    visible: boolean;
    snap: boolean;
    curPos: Vector | null;
  };
  bounds: Rect;
  zoomPan: ZoomPan;
  selectedTool: Mode | null;
  toolOptions: {
    [K in ToolWithOptions]: ToolOptMapping[K];
  };
  modeStack: Mode[];
  place: {
    obj: TileGroup | null;
    flipX: boolean;
  };
  selectedObjs: EntityState<MapObj, string>;
  proposedSelection: {
    objects: MapObj[];
    pos: Vector;
  } | null;
  layers: {
    active: number;
    visible: number[];
    lockInactive: boolean;
    dimInactive: boolean;
  };
}

const tgiSelectors = selectedAdapter.getSelectors(
  (state: MapEditorState) => state.selectedObjs
);

export const slice = createSlice({
  name: "mapEditor",
  initialState: {
    grid: {
      size: 16,
      visible: true,
      snap: true,
      curPos: null,
    },
    bounds: { ul: { x: 0, y: 0 }, br: { x: 5000, y: 5000 } },
    zoomPan: { zoom: 1, pan: { x: 0, y: 0 } },
    place: {
      obj: null,
      flipX: false,
    },
    selectedObjs: selectedAdapter.getInitialState(),
    proposedSelection: null,
    selectedTool: null,
    toolOptions: {
      paint: { mode: "place-once", size: 1, snap: "object" },
      "magic-paint": { candidates: [], gridPosFreeze: null },
      "add-collider": { type: "box" },
    },
    modeStack: [],
    layers: {
      active: MapLayerName.Ground,
      visible: [
        MapLayerName.Ground,
        MapLayerName.World,
        MapLayerName.Colliders,
      ],
      lockInactive: true,
      dimInactive: false,
    },
  } as MapEditorState,
  reducers: {
    setZoomPan(state, action: PayloadAction<ZoomPan>) {
      state.zoomPan = action.payload;
    },

    setGridSnap(state, action: { payload: boolean }) {
      state.grid.snap = action.payload;
    },

    setActiveLayer(state, action: { payload: MapLayerName }) {
      const newLayer = action.payload;
      state.layers.active = newLayer;

      selectedAdapter.removeAll(state.selectedObjs);

      if (
        state.selectedTool === "magic-paint" &&
        newLayer !== MapLayerName.Ground
      ) {
        state.selectedTool = null;
        state.modeStack = [];
      }
    },

    setLockInactiveLayer(state, action: { payload: boolean }) {
      state.layers.lockInactive = action.payload;
    },

    setDimInactiveLayer(state, action: { payload: boolean }) {
      state.layers.dimInactive = action.payload;
    },

    setPlace(state, action: PayloadAction<TileGroup | null>) {
      state.place.obj = action.payload;
      if (state.layers.active === MapLayerName.Ground && action.payload) {
        state.grid.size = action.payload.gridSize;
      }
    },

    setGridPos(state, action: PayloadAction<Vector>) {
      state.grid.curPos = action.payload;
    },

    toggleFlipX(state) {
      state.place.flipX = !state.place.flipX;
    },

    setOneSelected: (state, action: PayloadAction<MapObj>) => {
      selectedAdapter.removeAll(state.selectedObjs);
      selectedAdapter.setOne(state.selectedObjs, action.payload);
    },

    addOneSelected: (state, action: PayloadAction<MapObj>) => {
      selectedAdapter.setOne(state.selectedObjs, action.payload);
    },

    setManySelected: (state, action: PayloadAction<MapObj[]>) => {
      selectedAdapter.removeAll(state.selectedObjs);
      selectedAdapter.setMany(state.selectedObjs, action.payload);
    },

    addManySelected: (state, action: PayloadAction<MapObj[]>) => {
      selectedAdapter.setMany(state.selectedObjs, action.payload);
    },

    updateManySelected: (
      state,
      action: PayloadAction<{ id: string; changes: Partial<MapObj> }[]>
    ) => {
      selectedAdapter.updateMany(state.selectedObjs, action.payload);
    },

    removeOneSelected: (state, action: PayloadAction<MapObj>) => {
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
      state.selectedTool = null;
    },

    setActiveTool(state, action: PayloadAction<Mode | null>) {
      const mode = action.payload;
      state.selectedTool = mode;
    },

    setToolOptions<K extends ToolWithOptions>(
      state: MapEditorState,
      action: PayloadAction<{ tool: K; options: Partial<ToolOptMapping[K]> }>
    ) {
      const { tool, options } = action.payload;
      state.toolOptions[tool] = { ...state.toolOptions[tool], ...options };
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
