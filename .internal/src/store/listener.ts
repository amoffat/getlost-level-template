import { log } from "@/log";
import { saveTileset } from "@/persist/api";
import { actions as tsActions } from "@/slices/tilesetEditor";
import { Tileset } from "@/types/tileset";
import {
  createListenerMiddleware,
  isAnyOf,
  type TypedStartListening,
} from "@reduxjs/toolkit";
import { EMPTY, Subject, from } from "rxjs";
import {
  catchError,
  concatMap,
  debounceTime,
  groupBy,
  mergeMap,
  tap,
} from "rxjs/operators";
import { AppDispatch, type RootState } from "./store";

export const listenerMiddleware = createListenerMiddleware();

type AppStartListening = TypedStartListening<RootState, AppDispatch>;
export const startAppListening =
  listenerMiddleware.startListening as AppStartListening;

type TsAction =
  | ReturnType<typeof tsActions.addTileset>
  | ReturnType<typeof tsActions.bulkAddSinglePaletteTiles>
  | ReturnType<typeof tsActions.addPaletteObject>
  | ReturnType<typeof tsActions.addSinglePaletteTile>;

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

startAppListening({
  matcher: isAnyOf(
    tsActions.addTileset,
    tsActions.bulkAddSinglePaletteTiles,
    tsActions.addPaletteObject,
    tsActions.addSinglePaletteTile
  ),
  effect: async (action: TsAction, { dispatch, getState }) => {
    if (tsActions.addTileset.match(action)) {
      const { triggerAutosave } = action.payload;
      if (!triggerAutosave) return;
    }

    // All matched actions carry a { ts: Tileset } payload
    const { tsId } = action.payload;
    const ts = getState().tilesetEditor.tilesets[tsId];
    saveRequests$.next({ ts, dispatch });
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
