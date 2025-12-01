import { log } from "@/log";
import { deleteTileset, saveTileset } from "@/persist/tileset/api";
import { slice, actions as tsActions } from "@/slices/tilesetEditor";
import { AppStartListening } from "@/types/redux";
import { makeGroupedDebouncer } from "@/utils/debounce";
import { createListenerMiddleware } from "@reduxjs/toolkit";
import { EMPTY, from } from "rxjs";
import { catchError, tap } from "rxjs/operators";

const listenerMiddleware = createListenerMiddleware();

const debounceSaves = makeGroupedDebouncer();

const startAppListening =
  listenerMiddleware.startListening as AppStartListening;

startAppListening({
  // Any action with a reconcileType
  predicate: (action) =>
    action.type.startsWith(slice.name) &&
    (action.meta as any)?.reconcileType !== undefined,

  effect: async (action, { dispatch, getState }) => {
    // All matched actions carry a { ts: Tileset } payload
    const { tsId } = action.payload as { tsId: string | undefined };
    if (!tsId) return;

    const ts = getState().tilesetEditor.tilesets[tsId];

    const save = () =>
      from(saveTileset(ts)).pipe(
        tap(() => dispatch(tsActions.markSaved({ tsId: ts.id, saved: true }))),
        catchError((e) => {
          log.error({ e }, "Autosave failed");
          return EMPTY;
        })
      );

    debounceSaves(ts.id, save);
  },
});

startAppListening({
  actionCreator: tsActions.removeTileset,
  effect: async (action: ReturnType<typeof tsActions.removeTileset>) => {
    await deleteTileset(action.payload);
  },
});

export default listenerMiddleware.middleware;
