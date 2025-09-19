import { ReduxReconciler } from "@/editor/map/reconciler";
import { MapObj } from "@/types/editor";
import { createEntityAdapter, createSlice } from "@reduxjs/toolkit";

const objects = createEntityAdapter<MapObj>({
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

const initialState = objects.getInitialState();

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
});

export const selectors = objects.getSelectors<{
  objects: typeof initialState;
}>((s) => s.objects);

export const actions = objectsSlice.actions;
export default objectsSlice.reducer;
