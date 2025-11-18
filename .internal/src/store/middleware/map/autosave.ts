import { log } from "@/log";
import { saveMap as persistMap } from "@/persist/map/api";
import { slice } from "@/slices/mapEditor";
import { type RootState } from "@/store/store";
import { AppStartListening } from "@/types/redux";
import { createListenerMiddleware } from "@reduxjs/toolkit";
import { EMPTY, Subject, from } from "rxjs";
import { catchError, concatMap, debounceTime, tap } from "rxjs/operators";

const listenerMiddleware = createListenerMiddleware();

// Stream of save requests for the single map
const saveRequests$ = new Subject<{ map: RootState["mapEditor"] }>();

saveRequests$
  .pipe(
    debounceTime(500), // collapse rapid bursts of actions
    concatMap(({ map }) =>
      from(persistMap(map)).pipe(
        tap(() => {
          // If a future 'markSaved' action is added to the map slice, dispatch it here.
        }),
        catchError((e) => {
          log.error({ e }, "Map autosave failed");
          return EMPTY;
        })
      )
    )
  )
  .subscribe();

const startAppListening =
  listenerMiddleware.startListening as AppStartListening;

startAppListening({
  // Any action with a reconcileType
  predicate: (action) =>
    action.type.startsWith(slice.name) &&
    (action.meta as any)?.reconcileType !== undefined,
  effect: async (_action, { getState }) => {
    const state = getState();
    saveRequests$.next({ map: state.mapEditor });
  },
});

export default listenerMiddleware.middleware;
