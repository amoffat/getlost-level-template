import { MapObj } from "@/types/map";
import { createEntityAdapter, createSlice } from "@reduxjs/toolkit";

const objects = createEntityAdapter<MapObj>({
  sortComparer: (a, b) => {
    return a.id.localeCompare(b.id);
  },
});

type MapObjState = ReturnType<typeof objects.getInitialState>;

interface MapState extends MapObjState {
  loading: boolean;
  loaded: boolean;
  error: string | null;
}

const initialState: MapState = Object.assign(objects.getInitialState(), {
  loading: false,
  loaded: false,
  error: null,
});

const reconcilePrefix = "map";

export const slice = createSlice({
  name: "objects",
  initialState,
  reducers: {
    addOne: {
      prepare: (payload: MapObj) => ({
        meta: { reconcilePrefix, reconcileType: "add" as const },
        payload,
      }),
      reducer: objects.addOne,
    },
    addMany: {
      prepare: (payload: MapObj[]) => ({
        meta: { reconcilePrefix, reconcileType: "add" as const },
        payload,
      }),
      reducer: objects.addMany,
    },
    upsertMany: {
      prepare: (payload: MapObj[]) => ({
        meta: { reconcilePrefix, reconcileType: "add" as const },
        payload,
      }),
      reducer: objects.upsertMany,
    },
    updateOne: {
      prepare: (payload: { id: string; changes: Partial<MapObj> }) => ({
        meta: { reconcilePrefix, reconcileType: "update" as const },
        payload,
      }),
      reducer: objects.updateOne,
    },
    updateMany: {
      prepare: (payload: Array<{ id: string; changes: Partial<MapObj> }>) => ({
        meta: { reconcilePrefix, reconcileType: "update" as const },
        payload,
      }),
      reducer: objects.updateMany,
    },
    removeOne: {
      prepare: (payload: string) => ({
        meta: { reconcilePrefix, reconcileType: "remove" as const },
        payload,
      }),
      reducer: objects.removeOne,
    },
    removeMany: {
      prepare: (payload: string[]) => ({
        meta: { reconcilePrefix, reconcileType: "remove" as const },
        payload,
      }),
      reducer: objects.removeMany,
    },
    setAll: {
      prepare: (payload: MapObj[]) => ({
        meta: { reconcilePrefix, reconcileType: "setAll" as const },
        payload,
      }),
      reducer: objects.setAll,
    },
  },
  extraReducers: (builder) => {
    builder
      .addMatcher(
        (action): action is any => action.type === "map/loadMapThunk/pending",
        (state) => {
          state.loading = true;
          state.error = null;
        }
      )
      .addMatcher(
        (action): action is any => action.type === "map/loadMapThunk/fulfilled",
        (state) => {
          state.loading = false;
          state.loaded = true;
        }
      )
      .addMatcher(
        (action): action is any => action.type === "map/loadMapThunk/rejected",
        (state, action) => {
          state.loading = false;
          state.error = action.error?.message ?? "Failed to load map";
        }
      );
  },
});

export const selectors = objects.getSelectors<{
  map: typeof initialState;
}>((s) => s.map);

export const actions = slice.actions;
