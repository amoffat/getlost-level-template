import * as constants from "@/constants";
import { globals } from "@/globals";
import { Card } from "@/types/card";
import { Mode } from "@/types/editor";
import { MapLayerName } from "@/types/layer";

import {
  isAnimatedInstance,
  isNpcInstance,
  isSpeakableObject,
  isTileGroupInstance,
  MapObj,
  MapObjType,
  NpcInstance,
  SpeakableMapObj,
} from "@/types/map";
import {
  EntranceProps,
  ExitProps,
  LightProps,
  PickupProps,
} from "@/types/properties";
import { Rect } from "@/types/rect";
import { isTileGroupTemplate } from "@/types/tilegroup";
import { TemplateObject } from "@/types/tilesetobject";
import {
  AutotilerOpts,
  FillOpts,
  PaintOpts,
  ZonePaintOpts,
} from "@/types/tools";
import { ZoomPan } from "@/types/zoompan";
import { HasId } from "@/utils/misc";
import {
  addToTemplateIndex,
  clearTemplateIndex,
  removeFromTemplateIndex,
  updateTemplateIndex,
} from "@/utils/templateIndex";
import { Vector2 } from "@/vec";
import {
  createEntityAdapter,
  createSelector,
  createSlice,
  PayloadAction,
} from "@reduxjs/toolkit";

type ToolOptMapping = {
  paint: PaintOpts;
  autotiler: AutotilerOpts;
  "paint-zone": ZonePaintOpts;
  fill: FillOpts;
};

// Derive the tool names with options directly from the mapping type.
type ToolWithOptions = keyof ToolOptMapping;

const objectsAdapter = createEntityAdapter<MapObj>({
  sortComparer: (a, b) => {
    return a.id.localeCompare(b.id);
  },
});

const createMapSelector = createSelector.withTypes<MapEditorState>();

const reconcilePrefix = "map";

interface MapEditorState {
  grid: {
    size: Vector2;
    visible: boolean;
    snap: boolean;
    curPos: Vector2 | null;
  };
  bounds: Rect;
  card: Card | null;
  zoomPan: ZoomPan;
  activeTool: Mode | null;
  toolOptions: {
    [K in ToolWithOptions]: ToolOptMapping[K];
  };
  modeStack: Mode[];
  place: {
    obj: TemplateObject | null;
    flipX: boolean;
  };
  objects: ReturnType<typeof objectsAdapter.getInitialState>;
  selectedIds: string[];
  // These are objects that are being hovered over, but not yet selected. Used
  // for showing the proposed selection menu.
  proposedSelection: {
    objects: MapObj[];
    pos: Vector2;
  } | null;
  uncommittedObjIds: string[];
  layers: {
    active: MapLayerName;
    visible: MapLayerName[];
    hiddenLayers: MapLayerName[];
  };
  templates: {
    lights: LightProps & HasId;
    entryGateways: EntranceProps & HasId;
    exitGateways: ExitProps & HasId;
    pickups: PickupProps & HasId;
  };
}

export const slice = createSlice({
  name: "mapEditor",
  initialState: {
    grid: {
      size: { x: 16, y: 16 },
      visible: true,
      snap: true,
      curPos: null,
    },
    card: null,
    bounds: { x: -2048, y: -2048, width: 4096, height: 4096 },
    zoomPan: { zoom: 1, pan: { x: 0, y: 0 } },
    place: {
      obj: null,
      flipX: false,
    },
    objects: objectsAdapter.getInitialState(),
    selectedIds: [],
    proposedSelection: null,
    activeTool: null,
    toolOptions: {
      paint: { mode: "place-once", size: 1, snap: "object" },
      autotiler: { candidates: [], gridPosFreeze: null },
      "paint-zone": {
        mode: "paint",
        brushSize: 16,
        brushShape: "square",
        overlayOpacity: 0.5,
        showPolygons: false,
        simplify: 0.5,
        zoneType: MapObjType.CollisionZone,
      },
      fill: {
        candidates: [],
        density: 0,
        bounds: null,
      },
    },
    modeStack: [],
    layers: {
      active: MapLayerName.Exterior,
      visible: [MapLayerName.Ground, MapLayerName.Exterior, MapLayerName.Zones],
      hiddenLayers: [],
    },
    templates: {
      lights: {
        id: constants.lightTemplateId,
        name: "",
        color: constants.defaultLightColor,
        intensity: constants.defaultLightIntensity,
        hidden: false,
        flicker: "constant",
        offDuringDay: false,
      },
      entryGateways: {
        id: constants.entryTemplateId,
        slug: null,
        tags: [],
        exitIds: [],
        status: null,
      },
      exitGateways: {
        id: constants.exitTemplateId,
        slug: null,
        tags: [],
        force: false,
        preferredEntranceId: null,
        sensorRadius: constants.defaultExitSensorRadius,
        status: null,
      },
      pickups: {
        nameKey: null,
        hidden: false,
        id: constants.pickupTemplateId,
        assetId: null,
        tags: [],
        status: null,
      },
    },
    uncommittedObjIds: [],
  } as MapEditorState,
  reducers: {
    updateTemplate<Name extends keyof MapEditorState["templates"]>(
      state: MapEditorState,
      action: PayloadAction<{
        name: Name;
        updates: Partial<MapEditorState["templates"][Name]>;
      }>,
    ) {
      const { name, updates } = action.payload;
      const existing = state.templates[name];
      state.templates[name] = { ...existing, ...updates };
    },
    setZoomPan(state, action: PayloadAction<ZoomPan>) {
      state.zoomPan = action.payload;
    },

    setBounds: {
      prepare: (payload: Rect) => ({
        meta: { reconcilePrefix, reconcileType: "misc" as const },
        payload,
      }),
      reducer: (state, action: PayloadAction<Rect>) => {
        state.bounds = action.payload;
      },
    },

    setGridSnap(state, action: { payload: boolean }) {
      state.grid.snap = action.payload;
    },

    setActiveLayer(state, action: { payload: MapLayerName }) {
      const newLayer = action.payload;
      state.layers.active = newLayer;
      state.selectedIds = [];
      state.layers.hiddenLayers = state.layers.hiddenLayers.filter(
        (l) => l !== newLayer,
      );

      if (
        state.activeTool === "autotiler" &&
        newLayer !== MapLayerName.Ground
      ) {
        state.activeTool = null;
        state.modeStack = [];
      }
    },

    setLayerHidden(
      state,
      action: { payload: { layer: MapLayerName; hidden: boolean } },
    ) {
      const { layer, hidden } = action.payload;
      if (hidden) {
        if (!state.layers.hiddenLayers.includes(layer)) {
          state.layers.hiddenLayers.push(layer);
        }
      } else {
        state.layers.hiddenLayers = state.layers.hiddenLayers.filter(
          (l) => l !== layer,
        );
      }
    },

    setPlace(state, action: PayloadAction<TemplateObject | null>) {
      const obj = action.payload;
      state.place.obj = obj;
      if (
        state.layers.active === MapLayerName.Ground &&
        obj &&
        isTileGroupTemplate(obj)
      ) {
        state.grid.size = obj.gridSize;
      }
    },

    setGridPos(state, action: PayloadAction<Vector2>) {
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
        (id) => id !== action.payload,
      );
    },

    clearSelection: (state) => {
      state.selectedIds = [];
      state.place.obj = null;
    },

    setProposedSelection(
      state,
      action: PayloadAction<MapEditorState["proposedSelection"]>,
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
      state.activeTool = null;
    },

    setActiveTool(state, action: PayloadAction<Mode | null>) {
      const mode = action.payload;
      state.activeTool = mode;
    },

    setToolOptions<K extends ToolWithOptions>(
      state: MapEditorState,
      action: PayloadAction<{ tool: K; options: Partial<ToolOptMapping[K]> }>,
    ) {
      const { tool, options } = action.payload;
      state.toolOptions[tool] = { ...state.toolOptions[tool], ...options };
    },

    setUncommittedObjIds(state, action: PayloadAction<string[]>) {
      state.uncommittedObjIds = action.payload;
    },

    //

    addOne: {
      prepare: (payload: MapObj) => ({
        meta: { reconcilePrefix, reconcileType: "add" as const },
        payload,
      }),
      reducer: (state, action: PayloadAction<MapObj>) => {
        objectsAdapter.addOne(state.objects, action.payload);
        addToTemplateIndex(globals.templateIndex, action.payload);
      },
    },
    addMany: {
      prepare: (payload: MapObj[]) => ({
        meta: { reconcilePrefix, reconcileType: "add" as const },
        payload,
      }),
      reducer: (state, action: PayloadAction<MapObj[]>) => {
        objectsAdapter.addMany(state.objects, action.payload);
        for (const obj of action.payload) {
          addToTemplateIndex(globals.templateIndex, obj);
        }
      },
    },
    upsertMany: {
      prepare: (payload: MapObj[]) => ({
        meta: { reconcilePrefix, reconcileType: "add" as const },
        payload,
      }),
      reducer: (state, action: PayloadAction<MapObj[]>) => {
        for (const obj of action.payload) {
          const existing = state.objects.entities[obj.id];
          if (existing) {
            updateTemplateIndex(globals.templateIndex, existing, obj);
          } else {
            addToTemplateIndex(globals.templateIndex, obj);
          }
        }
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
        action: PayloadAction<{ id: string; changes: Partial<MapObj> }>,
      ) => {
        const oldObj = state.objects.entities[action.payload.id];
        if (oldObj) {
          const newObj = { ...oldObj, ...action.payload.changes } as MapObj;
          updateTemplateIndex(globals.templateIndex, oldObj as MapObj, newObj);
        }
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
        action: PayloadAction<Array<{ id: string; changes: Partial<MapObj> }>>,
      ) => {
        for (const update of action.payload) {
          const oldObj = state.objects.entities[update.id];
          if (oldObj) {
            const newObj = { ...oldObj, ...update.changes } as MapObj;
            updateTemplateIndex(
              globals.templateIndex,
              oldObj as MapObj,
              newObj,
            );
          }
        }
        objectsAdapter.updateMany(state.objects, action.payload);
      },
    },
    removeOne: {
      prepare: (payload: string) => ({
        meta: { reconcilePrefix, reconcileType: "remove" as const },
        payload,
      }),
      reducer: (state, action: PayloadAction<string>) => {
        const obj = state.objects.entities[action.payload];
        if (obj) {
          removeFromTemplateIndex(globals.templateIndex, obj);
        }
        objectsAdapter.removeOne(state.objects, action.payload);
        // Keep selectedIds in sync — a stale ID would cause selectedObjs to
        // return undefined for the missing entity.
        state.selectedIds = state.selectedIds.filter(
          (id) => id !== action.payload,
        );
      },
    },
    removeMany: {
      prepare: (payload: string[]) => ({
        meta: { reconcilePrefix, reconcileType: "remove" as const },
        payload,
      }),
      reducer: (state, action: PayloadAction<string[]>) => {
        for (const id of action.payload) {
          const obj = state.objects.entities[id];
          if (obj) {
            removeFromTemplateIndex(globals.templateIndex, obj);
          }
        }
        objectsAdapter.removeMany(state.objects, action.payload);
        // Keep selectedIds in sync — a stale ID would cause selectedObjs to
        // return undefined for the missing entity.
        const removedSet = new Set(action.payload);
        state.selectedIds = state.selectedIds.filter(
          (id) => !removedSet.has(id),
        );
      },
    },
    setAll: {
      prepare: (payload: MapObj[]) => ({
        meta: { reconcilePrefix, reconcileType: "setAll" as const },
        payload,
      }),
      reducer: (state, action: PayloadAction<MapObj[]>) => {
        // Rebuild the entire template index
        clearTemplateIndex(globals.templateIndex);
        for (const obj of action.payload) {
          addToTemplateIndex(globals.templateIndex, obj);
        }
        objectsAdapter.setAll(state.objects, action.payload);
      },
    },

    setCard: {
      prepare: (payload: Card) => ({
        meta: { reconcilePrefix, reconcileType: "misc" as const },
        payload,
      }),
      reducer: (state, action: PayloadAction<Card>) => {
        state.card = action.payload;
      },
    },
  },
  selectors: {
    selectActiveLayer: createMapSelector(
      [(state) => state.layers.active],
      (layer) => layer,
    ),
    selectProposed: createMapSelector(
      [(state) => state.layers.active, (state) => state.proposedSelection],
      (layer, proposed) => {
        if (proposed) {
          const valid = proposed?.objects.filter((p) => p.layer === layer);
          return {
            ...proposed,
            objects: valid,
          };
        } else {
          return null;
        }
      },
    ),
    selectCard: createMapSelector(
      [(state) => state.card],
      (card): Card | null => card,
    ),
    selectMode: createMapSelector(
      [(state) => state.modeStack],
      (modeStack): Mode => modeStack.at(-1) ?? "select",
    ),
    selectObject: createMapSelector(
      [(state) => state.objects.entities, (_, id: string) => id],
      (entities, id): MapObj | undefined => entities[id],
    ),
    selectedObjs: createMapSelector(
      [(state) => state.selectedIds, (state) => state.objects.entities],
      (selectedIds, entities): MapObj[] =>
        selectedIds
          .map((id) => entities[id])
          // Guard against IDs that outlive their entity (e.g. removed mid-drag).
          .filter((obj): obj is MapObj => obj !== undefined),
    ),
    selectNpcs: createMapSelector(
      [(state) => state.objects.entities],
      (entities): NpcInstance[] =>
        Object.values(entities).filter((obj): obj is NpcInstance =>
          isNpcInstance(obj),
        ),
    ),
    selectSpeakers: createMapSelector(
      [(state) => state.objects.entities],
      (entities): SpeakableMapObj[] =>
        Object.values(entities).filter(isSpeakableObject) as SpeakableMapObj[],
    ),
    numSelectedTgInstances: createMapSelector(
      [(state) => state.selectedIds, (state) => state.objects.entities],
      (selectedIds, entities): number => {
        let count = 0;
        for (const id of selectedIds) {
          const obj = entities[id];
          if (obj && isTileGroupInstance(obj)) {
            count++;
          }
        }
        return count;
      },
    ),
    objectsByTemplateId: createMapSelector(
      [(state) => state.objects.entities, (_, tmplId: string) => tmplId],
      (entities, tmplId): MapObj[] => {
        const ids = globals.templateIndex.get(tmplId)!;
        const objs = [];
        for (const id of ids) {
          const obj = entities[id]!;
          objs.push(obj);
        }
        return objs;
      },
    ),
    paletteSelectedTsObjIds: createMapSelector(
      [
        (state) => state.selectedIds,
        (state) => state.objects.entities,
        (state) => state.place.obj,
      ],
      (selectedIds, entities, placeObj): Set<string> => {
        const result = new Set<string>();

        // Single loop through selectedIds
        for (const id of selectedIds) {
          const instance = entities[id];
          if (instance) {
            if (isTileGroupInstance(instance)) {
              result.add(instance.tsObjId);
            } else if (isAnimatedInstance(instance)) {
              result.add(instance.tsObjId);
            } else if (isNpcInstance(instance)) {
              result.add(instance.tsObjId);
            }
          }
        }

        // Add placeObj if present
        if (placeObj) {
          result.add(placeObj.id);
        }

        return result;
      },
      {
        memoizeOptions: {
          // Only return new Set if contents actually changed
          resultEqualityCheck: (a, b) => {
            if (a.size !== b.size) return false;
            for (const item of a) {
              if (!b.has(item)) return false;
            }
            return true;
          },
        },
      },
    ),
  },
});

export const selectors = slice.selectors;
export const objSelectors = objectsAdapter.getSelectors();
export const actions = slice.actions;
