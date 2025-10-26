// store.ts
import { ReduxReconciler } from "@/editor/common/reconciler";
import { createListenerMiddleware } from "@reduxjs/toolkit";
import { AppDispatch, RootState } from "../store";

export function makeEditorSyncMiddleware(
  prefix: string,
  reconciler: ReduxReconciler<any, any>
) {
  const listener = createListenerMiddleware();
  const startAppListening = listener.startListening.withTypes<
    RootState,
    AppDispatch
  >();

  // Helper extractors to handle various action payload shapes across slices
  const getReconcileType = (action: any): string | undefined =>
    action?.meta?.reconcileType;

  // Only handle actions that match our provided prefix. This allows us to
  // scope reconciliation to a particular slice to avoid cross-bleed.
  const matchesPrefix = (action: any): boolean => {
    const metaPrefix = action?.meta?.reconcilePrefix as string | undefined;
    return metaPrefix === prefix;
  };

  // startAppListening({
  //   predicate: (action) => true,
  //   effect: async (action: any, _api) => {
  //     log.info(`[Reconciler:${prefix}] action: ${action.type}`);
  //   },
  // });

  // Add
  startAppListening({
    predicate: (action) =>
      matchesPrefix(action) && getReconcileType(action) === "add",
    effect: async (action: any, _api) => {
      const data = action?.meta?.reconcile ?? action.payload;
      const payload = Array.isArray(data) ? data : [data];
      for (const obj of payload) reconciler.enqueueAdd(obj);
    },
  });

  // Update
  startAppListening({
    predicate: (action) =>
      matchesPrefix(action) && getReconcileType(action) === "update",
    effect: async (action: any, _api) => {
      const data = action?.meta?.reconcile ?? action.payload;
      const updates = Array.isArray(data) ? data : [data];
      for (const u of updates) {
        reconciler.enqueueUpdate(u.id, u.changes);
      }
    },
  });

  // Remove
  startAppListening({
    predicate: (action) =>
      matchesPrefix(action) && getReconcileType(action) === "remove",
    effect: async (action: any, _api) => {
      const data = action?.meta?.reconcile ?? action.payload;
      const ids = Array.isArray(data) ? data : [data];
      for (const id of ids) reconciler.enqueueRemove(id);
    },
  });

  // Optional: if you sometimes `setAll`, use one-shot diff (still O(#diff)):
  startAppListening({
    predicate: (action) =>
      matchesPrefix(action) && getReconcileType(action) === "setAll",
    effect: async (action: any, _api) => {
      // `meta.reconcile` can override the full array to be diffed
      const full = (action?.meta?.reconcile ?? action.payload) as any[];
      reconciler.enqueueDiff(full);
    },
  });

  return listener.middleware;
}
