import {
  objectsActions as collisionObjectsActions,
  objectsReducer as collisionObjectsReducer,
  slice as collisionSlice,
} from "@/editor/collision/state";
import { globals as g } from "@/globals";
import { slice as dialogueSlice } from "@/slices/dialogue";
import { slice as mapSlice } from "@/slices/map";
import { slice as mapEditorSlice } from "@/slices/mapEditor";
import { slice as npcEditorSlice } from "@/slices/npcEditor";
import { slice as tilesetEditorSlice } from "@/slices/tilesetEditor";
import { slice as uiSlice } from "@/slices/ui";
import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { makeEditorSyncMiddleware } from "./middleware/map";
import autosaveMapMiddleware from "./middleware/map/autosave";
import autosaveTilesetMiddleware from "./middleware/tileset/autosave";

export const rootReducer = combineReducers({
  dialogue: dialogueSlice.reducer,
  tilesetEditor: tilesetEditorSlice.reducer,
  mapEditor: mapEditorSlice.reducer,
  npcEditor: npcEditorSlice.reducer,
  collisionEditor: collisionSlice.reducer,
  map: mapSlice.reducer,
  ui: uiSlice.reducer,
  collisionObjects: collisionObjectsReducer,
});

const mapMiddleware = makeEditorSyncMiddleware(
  mapSlice.actions,
  g.mapEditorReconciler
);

const collisionMiddleware = makeEditorSyncMiddleware(
  collisionObjectsActions,
  g.collisionEditorReconciler
);

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    // We also add our middleware for the RTK Query API slices here, which
    // handle things like async thunks.
    getDefaultMiddleware().prepend(
      autosaveTilesetMiddleware,
      autosaveMapMiddleware,
      mapMiddleware,
      collisionMiddleware
    ),
});

// Connects the store to page listeners, so that we can respond to the page
// being focused if we want to.
setupListeners(store.dispatch);

export type RootState = ReturnType<typeof rootReducer>;
export type StoreType = typeof store;
export type AppDispatch = typeof store.dispatch;
