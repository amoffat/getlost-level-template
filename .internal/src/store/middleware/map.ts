// store.ts
import { ReduxReconciler } from "@/editor/map/reconciler";
import {
  createEntityAdapter,
  createListenerMiddleware,
  createSlice,
  isAnyOf,
  SliceCaseReducers,
} from "@reduxjs/toolkit";

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

  listener.startListening({
    matcher: isAnyOf(actions.addOne, actions.addMany, actions.upsertMany),
    effect: async (action, _api) => {
      const reconciler = getReconciler();
      const payload = Array.isArray(action.payload)
        ? action.payload
        : [action.payload];
      for (const obj of payload) reconciler.enqueueAdd(obj);
    },
  });

  listener.startListening({
    matcher: isAnyOf(actions.updateOne, actions.updateMany),
    effect: async (action, _api) => {
      const reconciler = getReconciler();
      const updates = Array.isArray((action as any).payload)
        ? (action as any).payload
        : [(action as any).payload];

      for (const u of updates) reconciler.enqueueUpdate(u.id, u.changes);
    },
  });

  listener.startListening({
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
  listener.startListening({
    actionCreator: actions.setAll,
    effect: async (action, _api) => {
      const reconciler = getReconciler();
      // `action.payload` is the full array; you can use that directly:
      reconciler.enqueueDiff(action.payload as any[]);
    },
  });

  return listener.middleware;
}
