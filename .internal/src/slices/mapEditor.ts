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
  PayloadAction,
} from "@reduxjs/toolkit";

type ToolOptMapping = {
  paint: PaintOpts;
  "magic-paint": MagicPaintOpts;
  "add-collider": ColliderOpts;
};

// Derive the tool names with options directly from the mapping type.
type ToolWithOptions = keyof ToolOptMapping;

const objectsAdapter = createEntityAdapter<MapObj>({
  sortComparer: (a, b) => {
    return a.id.localeCompare(b.id);
  },
});

const reconcilePrefix = "map";

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
  objects: ReturnType<typeof objectsAdapter.getInitialState>;
  selectedIds: string[];
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
    objects: objectsAdapter.getInitialState(),
    selectedIds: [],
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
      state.selectedIds = [];

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

    setOneSelected: (state, action: PayloadAction<string>) => {
      state.selectedIds = [action.payload];
    },

    addOneSelected: (state, action: PayloadAction<string>) => {
      state.selectedIds.push(action.payload);
    },

    setManySelected: (state, action: PayloadAction<string[]>) => {
      state.selectedIds = action.payload;
    },

    addManySelected: (state, action: PayloadAction<string[]>) => {
      state.selectedIds.push(...action.payload);
    },

    removeOneSelected: (state, action: PayloadAction<string>) => {
      state.selectedIds = state.selectedIds.filter(
        (id) => id !== action.payload
      );
    },

    clearSelection: (state) => {
      state.selectedIds = [];
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

    //

    addOne: {
      prepare: (payload: MapObj) => ({
        meta: { reconcilePrefix, reconcileType: "add" as const },
        payload,
      }),
      reducer: (state, action: PayloadAction<MapObj>) => {
        objectsAdapter.addOne(state.objects, action.payload);
      },
    },
    addMany: {
      prepare: (payload: MapObj[]) => ({
        meta: { reconcilePrefix, reconcileType: "add" as const },
        payload,
      }),
      reducer: (state, action: PayloadAction<MapObj[]>) => {
        objectsAdapter.addMany(state.objects, action.payload);
      },
    },
    upsertMany: {
      prepare: (payload: MapObj[]) => ({
        meta: { reconcilePrefix, reconcileType: "add" as const },
        payload,
      }),
      reducer: (state, action: PayloadAction<MapObj[]>) => {
        objectsAdapter.upsertMany(state.objects, action.payload);
      },
    },
    updateOne: {
      prepare: (payload: { id: string; changes: Partial<MapObj> }) => ({
        meta: { reconcilePrefix, reconcileType: "update" as const },
        payload,
      }),
      reducer: (
        state,
        action: PayloadAction<{ id: string; changes: Partial<MapObj> }>
      ) => {
        objectsAdapter.updateOne(state.objects, action.payload);
      },
    },
    updateMany: {
      prepare: (payload: Array<{ id: string; changes: Partial<MapObj> }>) => ({
        meta: { reconcilePrefix, reconcileType: "update" as const },
        payload,
      }),
      reducer: (
        state,
        action: PayloadAction<Array<{ id: string; changes: Partial<MapObj> }>>
      ) => {
        objectsAdapter.updateMany(state.objects, action.payload);
      },
    },
    removeOne: {
      prepare: (payload: string) => ({
        meta: { reconcilePrefix, reconcileType: "remove" as const },
        payload,
      }),
      reducer: (state, action: PayloadAction<string>) => {
        objectsAdapter.removeOne(state.objects, action.payload);
      },
    },
    removeMany: {
      prepare: (payload: string[]) => ({
        meta: { reconcilePrefix, reconcileType: "remove" as const },
        payload,
      }),
      reducer: (state, action: PayloadAction<string[]>) => {
        objectsAdapter.removeMany(state.objects, action.payload);
      },
    },
    setAll: {
      prepare: (payload: MapObj[]) => ({
        meta: { reconcilePrefix, reconcileType: "setAll" as const },
        payload,
      }),
      reducer: (state, action: PayloadAction<MapObj[]>) => {
        objectsAdapter.setAll(state.objects, action.payload);
      },
    },
  },
  selectors: {
    selectMode: createSelector.withTypes<MapEditorState>()(
      [(state) => state.modeStack],
      (modeStack): Mode => modeStack.at(-1) ?? "select"
    ),
    selectedObjs: createSelector.withTypes<MapEditorState>()(
      [(state) => state.selectedIds, (state) => state.objects.entities],
      (selectedIds, entities): MapObj[] => selectedIds.map((id) => entities[id])
    ),
  },
});

export const selectors = slice.selectors;
export const mapSelectors = objectsAdapter.getSelectors();
export const actions = slice.actions;
