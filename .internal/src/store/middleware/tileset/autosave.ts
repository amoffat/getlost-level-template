import { autosaveTilesetDebounce } from "@/constants";
import { log } from "@/log";
import { saveTileset } from "@/persist/tileset/api";
import { slice, actions as tsActions } from "@/slices/tilesetEditor";
import { AppStartListening } from "@/types/redux";
import { makeGroupedDebouncer } from "@/utils/debounce";
import { createListenerMiddleware } from "@reduxjs/toolkit";
import { EMPTY, from } from "rxjs";
import { catchError, tap } from "rxjs/operators";

const listenerMiddleware = createListenerMiddleware();

const debounceSaves = makeGroupedDebouncer(autosaveTilesetDebounce);

const startAppListening =
  listenerMiddleware.startListening as AppStartListening;

startAppListening({
  // Any action with a reconcileType
  predicate: (action) =>
    action.type.startsWith(slice.name) &&
    (action.meta as any)?.reconcileType !== undefined,

  effect: async (action, { dispatch, getState }) => {
    // All matched actions carry a { ts: Tileset } payload
    const tp = action.payload as any;
    const tsId = tp?.tsId;
    if (!tsId) return;

    const ts = getState().tilesetEditor.tilesets[tsId];

    const save = () =>
      from(saveTileset(ts)).pipe(
        tap(() => {
          dispatch(tsActions.markSaved({ tsId: ts.id, saved: true }));
          log.info(`Tileset ${ts.id} autosaved`);
        }),
        catchError((e) => {
          log.error({ e }, "Autosave failed");
          return EMPTY;
        }),
      );

    debounceSaves(ts.id, save);
  },
});

export default listenerMiddleware.middleware;
