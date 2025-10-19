// store.ts
import { ReduxReconciler } from "@/editor/common/reconciler";
import { createListenerMiddleware } from "@reduxjs/toolkit";
import { AppDispatch, RootState } from "../store";

type ActionsMap = Partial<Record<string, { type: string }>>;

export function makeEditorSyncMiddleware(
  actions: ActionsMap,
  reconciler: ReduxReconciler<any, any>
) {
  const listener = createListenerMiddleware();
  const startAppListening = listener.startListening.withTypes<
    RootState,
    AppDispatch
  >();

  // Add
  startAppListening({
    predicate: (action) => {
      const t = action.type;
      return (
        t === actions.addOne?.type ||
        t === actions.addMany?.type ||
        t === actions.upsertMany?.type
      );
    },
    effect: async (action: any, _api) => {
      const payload = Array.isArray(action.payload)
        ? action.payload
        : [action.payload];
      for (const obj of payload) reconciler.enqueueAdd(obj);
    },
  });

  // Update
  startAppListening({
    predicate: (action) => {
      const t = action.type;
      return t === actions.updateOne?.type || t === actions.updateMany?.type;
    },
    effect: async (action: any, _api) => {
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
    predicate: (action) => {
      const t = action.type;
      return t === actions.removeOne?.type || t === actions.removeMany?.type;
    },
    effect: async (action: any, _api) => {
      const ids = Array.isArray(action.payload)
        ? action.payload
        : [action.payload];
      for (const id of ids) reconciler.enqueueRemove(id);
    },
  });

  // Optional: if you sometimes `setAll`, use one-shot diff (still O(#diff)):
  startAppListening({
    predicate: (action) => action.type === actions.setAll?.type,
    effect: async (action: any, _api) => {
      // `action.payload` is the full array; you can use that directly:
      reconciler.enqueueDiff(action.payload as any[]);
    },
  });

  return listener.middleware;
}
