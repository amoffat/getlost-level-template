import { log } from "@/log";
import { deleteTileset, saveTileset } from "@/persist/tileset/api";
import { actions as tsActions } from "@/slices/tilesetEditor";
import { AppDispatch, type RootState } from "@/store/store";
import { AppStartListening } from "@/types/redux";
import { Tileset } from "@/types/tileset";
import { createListenerMiddleware, isAnyOf } from "@reduxjs/toolkit";
import { EMPTY, Subject, from } from "rxjs";
import {
  catchError,
  concatMap,
  debounceTime,
  groupBy,
  mergeMap,
  tap,
} from "rxjs/operators";

const listenerMiddleware = createListenerMiddleware();

type TsAction =
  | ReturnType<typeof tsActions.addTileset>
  | ReturnType<typeof tsActions.bulkAddSinglePaletteTiles>
  | ReturnType<typeof tsActions.addPaletteObject>
  | ReturnType<typeof tsActions.addSinglePaletteTile>
  | ReturnType<typeof tsActions.updateTileGroup>
  | ReturnType<typeof tsActions.deletePaletteObjects>;

// Stream of save requests; we group by tileset id to debounce per key
const saveRequests$ = new Subject<{ ts: Tileset; dispatch: AppDispatch }>();

saveRequests$
  .pipe(
    // group per tileset id
    groupBy(({ ts }) => ts.id),
    // for each group, debounce events and perform saves sequentially
    mergeMap((group$) =>
      group$.pipe(
        debounceTime(200),
        concatMap(({ ts, dispatch }) =>
          from(saveTileset(ts)).pipe(
            tap(() =>
              dispatch(tsActions.markSaved({ tsId: ts.id, saved: true }))
            ),
            catchError((e) => {
              log.error({ e }, "Autosave failed");
              return EMPTY;
            })
          )
        )
      )
    )
  )
  .subscribe();

const startAppListening =
  listenerMiddleware.startListening as AppStartListening;

startAppListening({
  matcher: isAnyOf(
    tsActions.addTileset,
    tsActions.bulkAddSinglePaletteTiles,
    tsActions.addPaletteObject,
    tsActions.addSinglePaletteTile,
    tsActions.updateTileGroup,
    tsActions.deletePaletteObjects
  ),

  effect: async (action: TsAction, { dispatch, getState }) => {
    // All matched actions carry a { ts: Tileset } payload
    const { tsId } = action.payload;
    const ts = getState().tilesetEditor.tilesets[tsId];
    saveRequests$.next({ ts, dispatch });
  },
});

startAppListening({
  actionCreator: tsActions.removeTileset,
  effect: async (action: ReturnType<typeof tsActions.removeTileset>) => {
    await deleteTileset(action.payload);
  },
});

// Manual "Save Now" action (callable from UI)
export const saveNow =
  () => async (dispatch: any, getState: () => RootState) => {
    const state = getState();
    const tsId = state.tilesetEditor.activeTilesetId!;
    const ts = state.tilesetEditor.tilesets[tsId];
    await saveTileset(ts);
    dispatch(tsActions.markSaved({ tsId, saved: true }));
  };

export default listenerMiddleware.middleware;
