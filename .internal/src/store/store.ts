import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import dialogueReducer from "../slices/dialogue";
import * as mapSlice from "../slices/map";
import mapEditorReducer from "../slices/mapEditor";
import npcEditorReducer from "../slices/npcEditor";
import tilesetEditorReducer from "../slices/tilesetEditor";
import uiReducer from "../slices/ui";
import { makeMiddleware as makeMapMiddleware } from "./middleware/map";
import autosaveMapMiddleware from "./middleware/map/autosave";
import autosaveTilesetMiddleware from "./middleware/tileset/autosave";

export const rootReducer = combineReducers({
  dialogue: dialogueReducer,
  tilesetEditor: tilesetEditorReducer,
  mapEditor: mapEditorReducer,
  npcEditor: npcEditorReducer,
  map: mapSlice.default,
  ui: uiReducer,
});

const mapMiddleware = makeMapMiddleware(
  mapSlice.actions,
  mapSlice.getReconciler
);

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    // We also add our middleware for the RTK Query API slices here, which
    // handle things like async thunks.
    getDefaultMiddleware().prepend(
      autosaveTilesetMiddleware,
      autosaveMapMiddleware,
      mapMiddleware
    ),
});

// Connects the store to page listeners, so that we can respond to the page
// being focused if we want to.
setupListeners(store.dispatch);

export type RootState = ReturnType<typeof rootReducer>;
export type StoreType = typeof store;
export type AppDispatch = typeof store.dispatch;
