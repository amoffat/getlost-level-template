import { log } from "@/log";
import { saveMap as persistMap } from "@/persist/map/api";
import { slice } from "@/slices/mapEditor";
import { type RootState } from "@/store/store";
import { AppStartListening } from "@/types/redux";
import { createListenerMiddleware } from "@reduxjs/toolkit";
import { EMPTY, Subject, from } from "rxjs";
import { catchError, concatMap, debounceTime, tap } from "rxjs/operators";

const listenerMiddleware = createListenerMiddleware();

// Persistence function (wrap real API and swallow large payload logging)
async function saveMap(mapState: any) {
  await persistMap(mapState);
  log.info("[autosave] Map saved (objects: %d)", mapState.ids?.length ?? 0);
}

// Stream of save requests for the single map
const saveRequests$ = new Subject<{ map: RootState["mapEditor"]["objects"] }>();

saveRequests$
  .pipe(
    debounceTime(500), // collapse rapid bursts of actions
    concatMap(({ map }) =>
      from(saveMap(map)).pipe(
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
  // Any action from the map slice
  predicate: (action) =>
    action.type.startsWith(slice.name) &&
    (action.meta as any)?.reconcileType !== undefined,
  effect: async (_action, { getState }) => {
    const state = getState();
    saveRequests$.next({ map: state.mapEditor.objects });
  },
});

export default listenerMiddleware.middleware;
