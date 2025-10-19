import { Mode } from "@/types/editors/collision";
import { MapObj, TileGroupInstance } from "@/types/map";
import { TileGroup } from "@/types/tilegroup";
import { PaintOpts } from "@/types/tools";
import { ZoomPan } from "@/types/zoompan";
import { Vector } from "@/vec";
import {
  createEntityAdapter,
  createSelector,
  createSlice,
  EntityState,
  PayloadAction,
} from "@reduxjs/toolkit";
import { MapLayerName } from "../../types/layer";

export const selectedAdapter = createEntityAdapter<MapObj>();

type ToolOptMapping = {
  paint: PaintOpts;
};

// Derive the tool names with options directly from the mapping type.
type ToolWithOptions = keyof ToolOptMapping;

interface CollisionEditorState {
  grid: {
    size: number;
    visible: boolean;
    snap: boolean;
    curPos: Vector | null;
  };
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
    objects: TileGroupInstance[];
    pos: Vector;
  } | null;
  layers: {
    active: MapLayerName;
  };
}

const tgiSelectors = selectedAdapter.getSelectors(
  (state: CollisionEditorState) => state.selectedObjs
);

export const slice = createSlice({
  name: "collisionEditor",
  initialState: {
    grid: {
      size: 16,
      visible: true,
      snap: true,
      curPos: null,
    },
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
    },
    modeStack: [],
    layers: {
      active: MapLayerName.Ground,
      lockInactive: true,
      dimInactive: false,
    },
  } as CollisionEditorState,
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
    },

    setPlace(state, action: PayloadAction<TileGroup | null>) {
      state.place.obj = action.payload;
    },

    setGridPos(state, action: PayloadAction<Vector>) {
      state.grid.curPos = action.payload;
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
      action: PayloadAction<CollisionEditorState["proposedSelection"]>
    ) {
      state.proposedSelection = action.payload;
    },

    pushMode(state, action: PayloadAction<Mode>) {
      if (state.modeStack.at(-1) === action.payload) return;
      state.modeStack.push(action.payload);
    },

    popMode(state) {
      state.modeStack.pop();
      state.selectedTool = state.modeStack.at(-1) ?? null;
    },

    setMode(state, action: PayloadAction<Mode>) {
      const mode = action.payload;

      if (mode === "select") {
        state.place.obj = null;
        state.place.flipX = false;
        state.selectedTool = null;
      }
      state.modeStack = [mode];
    },

    setActiveTool(state, action: PayloadAction<Mode | null>) {
      const mode = action.payload;
      state.selectedTool = mode;
    },

    setToolOptions<K extends ToolWithOptions>(
      state: CollisionEditorState,
      action: PayloadAction<{ tool: K; options: Partial<ToolOptMapping[K]> }>
    ) {
      const { tool, options } = action.payload;
      state.toolOptions[tool] = { ...state.toolOptions[tool], ...options };
    },
  },
  selectors: {
    selectMode: createSelector.withTypes<CollisionEditorState>()(
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
