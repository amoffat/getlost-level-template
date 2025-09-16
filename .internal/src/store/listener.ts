import { log } from "@/log";
import { saveTileset } from "@/persist/api";
import { actions as tsActions } from "@/slices/tilesetEditor";
import { Tileset } from "@/types/tileset";
import { createListenerMiddleware, isAnyOf } from "@reduxjs/toolkit";
import debounce from "debounce";
import { store, type RootState } from "./store";

export const listenerMiddleware = createListenerMiddleware();

const scheduleSave = debounce(async (tileset: Tileset, dispatch: any) => {
  try {
    await saveTileset(tileset);
    dispatch(tsActions.markSaved({ tsId: tileset.id, saved: true }));
  } catch (e) {
    log.error({ e }, "Autosave failed");
  }
}, 800);

listenerMiddleware.startListening({
  matcher: isAnyOf(
    tsActions.addTileset,
    tsActions.bulkAddSinglePaletteTiles,
    tsActions.addPaletteObject,
    tsActions.addSinglePaletteTile
  ),
  effect: async (_action) => {
    const state = store.getState();
    const tsId = state.tilesetEditor.activeTilesetId!;
    const ts = state.tilesetEditor.tilesets[tsId];
    scheduleSave(ts, store.dispatch);
  },
});

// Manual "Save Now" action (callable from UI)
export const saveNow =
  () => async (_dispatch: any, getState: () => RootState) => {
    const state = getState();
    const tsId = state.tilesetEditor.activeTilesetId!;
    const ts = state.tilesetEditor.tilesets[tsId];
    await saveTileset(ts);
    _dispatch(tsActions.markSaved({ tsId, saved: true }));
  };
