import { ReduxReconciler } from "@/editor/map/reconciler";
import { MapObj, TileGroupInstance } from "@/types/editor";
import { createEntityAdapter, createSlice } from "@reduxjs/toolkit";

const objects = createEntityAdapter<MapObj | TileGroupInstance>({
  sortComparer: (a, b) => {
    return a.id.localeCompare(b.id);
  },
});

let reconciler: ReduxReconciler | null = null;

export function getReconciler(): ReduxReconciler {
  if (!reconciler) throw new Error("Reconciler not set");
  return reconciler;
}

export function setReconciler(r: ReduxReconciler) {
  reconciler = r;
}

interface MapState extends ReturnType<typeof objects.getInitialState> {
  loading: boolean;
  loaded: boolean;
  error: string | null;
}

const initialState: MapState = Object.assign(objects.getInitialState(), {
  loading: false,
  loaded: false,
  error: null,
});

export const objectsSlice = createSlice({
  name: "objects",
  initialState,
  reducers: {
    addOne: objects.addOne,
    addMany: objects.addMany,
    upsertMany: objects.upsertMany,
    updateOne: objects.updateOne, // {id, changes}
    updateMany: objects.updateMany,
    removeOne: objects.removeOne,
    removeMany: objects.removeMany,
    setAll: objects.setAll,
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

export const actions = objectsSlice.actions;
export default objectsSlice.reducer;
