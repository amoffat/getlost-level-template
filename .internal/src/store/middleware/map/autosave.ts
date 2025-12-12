import { defaultTileSize } from "@/constants";
import { log } from "@/log";
import { saveMap as persistMap } from "@/persist/map/api";
import { slice } from "@/slices/mapEditor";
import { SavedMap } from "@/types/map";
import { AppStartListening } from "@/types/redux";
import { createListenerMiddleware } from "@reduxjs/toolkit";
import { EMPTY, Subject, from } from "rxjs";
import { catchError, concatMap, debounceTime, tap } from "rxjs/operators";

const listenerMiddleware = createListenerMiddleware();

// Stream of save requests for the single map
const saveRequests$ = new Subject<{ map: SavedMap }>();

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

    const map: SavedMap = {
      tileWidth: defaultTileSize,
      tileHeight: defaultTileSize,
      objects: state.mapEditor.objects,
      templates: state.mapEditor.templates,
    } satisfies SavedMap;

    saveRequests$.next({ map });
  },
});

export default listenerMiddleware.middleware;
