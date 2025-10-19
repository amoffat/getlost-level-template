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

export const slice = createSlice({
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

export const actions = slice.actions;
