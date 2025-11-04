import { log } from "@/log";
import { deleteTileset, saveTileset } from "@/persist/tileset/api";
import { actions as tsActions } from "@/slices/tilesetEditor";
import { AppStartListening } from "@/types/redux";
import { makeGroupedDebouncer } from "@/utils/debounce";
import { createListenerMiddleware, isAnyOf } from "@reduxjs/toolkit";
import { EMPTY, from } from "rxjs";
import { catchError, tap } from "rxjs/operators";

const listenerMiddleware = createListenerMiddleware();

type TsAction =
  | ReturnType<typeof tsActions.addTileset>
  | ReturnType<typeof tsActions.bulkAddSinglePaletteTiles>
  | ReturnType<typeof tsActions.addPaletteObject>
  | ReturnType<typeof tsActions.updateTilesetObject>
  | ReturnType<typeof tsActions.deletePaletteObjects>;

const debounceSaves = makeGroupedDebouncer();

const startAppListening =
  listenerMiddleware.startListening as AppStartListening;

startAppListening({
  matcher: isAnyOf(
    tsActions.addTileset,
    tsActions.bulkAddSinglePaletteTiles,
    tsActions.addPaletteObject,
    tsActions.updateTilesetObject,
    tsActions.deletePaletteObjects
  ),

  effect: async (action: TsAction, { dispatch, getState }) => {
    // All matched actions carry a { ts: Tileset } payload
    const { tsId } = action.payload;
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
