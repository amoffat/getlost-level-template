// store.ts
import { ReduxReconciler } from "@/editor/map/reconciler";
import {
  createEntityAdapter,
  createListenerMiddleware,
  createSlice,
  isAnyOf,
  SliceCaseReducers,
} from "@reduxjs/toolkit";
import { AppDispatch, RootState } from "../store";

type EntityAdapter<T = { id: string }> = ReturnType<
  typeof createEntityAdapter<T & { id: string }>
>;
type AdapterReducerNames =
  | "addMany"
  | "addOne"
  | "upsertMany"
  | "updateOne"
  | "updateMany"
  | "removeOne"
  | "removeMany"
  | "setAll";

type Reducers<T = { id: string }> = SliceCaseReducers<unknown> & {
  [K in AdapterReducerNames]: EntityAdapter<T>[K];
};

type SliceActions<T = { id: string }> = ReturnType<
  typeof createSlice<unknown, Reducers<T>, string, any>
>["actions"];

export function makeMiddleware<T = { id: string }>(
  actions: SliceActions<T>,
  getReconciler: () => ReduxReconciler
) {
  const listener = createListenerMiddleware();
  const startAppListening = listener.startListening.withTypes<
    RootState,
    AppDispatch
  >();

  // Add
  startAppListening({
    matcher: isAnyOf(actions.addOne, actions.addMany, actions.upsertMany),
    effect: async (action, _api) => {
      const reconciler = getReconciler();
      const payload = Array.isArray(action.payload)
        ? action.payload
        : [action.payload];
      for (const obj of payload) reconciler.enqueueAdd(obj);
    },
  });

  // Update
  startAppListening({
    matcher: isAnyOf(actions.updateOne, actions.updateMany),
    effect: async (action, _api) => {
      const reconciler = getReconciler();
      const updates = Array.isArray(action.payload)
        ? action.payload
        : [action.payload];

      for (const u of updates) {
        reconciler.enqueueUpdate(u.id, u.changes);
      }
    },
  });

  // Remove
  startAppListening({
    matcher: isAnyOf(actions.removeOne, actions.removeMany),
    effect: async (action, _api) => {
      const reconciler = getReconciler();
      const ids = Array.isArray(action.payload)
        ? action.payload
        : [action.payload];
      for (const id of ids) reconciler.enqueueRemove(id);
    },
  });

  // Optional: if you sometimes `setAll`, use one-shot diff (still O(#diff)):
  startAppListening({
    actionCreator: actions.setAll,
    effect: async (action, _api) => {
      const reconciler = getReconciler();
      // `action.payload` is the full array; you can use that directly:
      reconciler.enqueueDiff(action.payload);
    },
  });

  return listener.middleware;
}
