import { slice as collisionSlice } from "@/editor/collision/state";
import { globals as g } from "@/globals";
import { slice as dialogueSlice } from "@/slices/dialogue";
import { slice as mapEditorSlice } from "@/slices/mapEditor";
import { slice as npcEditorSlice } from "@/slices/npcEditor";
import { slice as storySlice } from "@/slices/story";
import { slice as tilesetEditorSlice } from "@/slices/tilesetEditor";
import { slice as uiSlice } from "@/slices/ui";
import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { makeEditorSyncMiddleware } from "./middleware/map";
import autosaveMapMiddleware from "./middleware/map/autosave";
import autosaveStoryMiddleware from "./middleware/story/autosave";
import autosaveTilesetMiddleware from "./middleware/tileset/autosave";

export const rootReducer = combineReducers({
  dialogue: dialogueSlice.reducer,
  story: storySlice.reducer,
  tilesetEditor: tilesetEditorSlice.reducer,
  mapEditor: mapEditorSlice.reducer,
  npcEditor: npcEditorSlice.reducer,
  collisionEditor: collisionSlice.reducer,
  ui: uiSlice.reducer,
});

const mapSyncMiddleware = makeEditorSyncMiddleware(
  "map",
  g.mapEditorReconciler
);

const tileSyncMiddleware = makeEditorSyncMiddleware(
  "tilesetEditor",
  g.tilesetEditorReconciler
);

// const collisionMiddleware = makeEditorSyncMiddleware(
//   collisionObjectsActions,
//   g.collisionEditorReconciler
// );

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    // We also add our middleware for the RTK Query API slices here, which
    // handle things like async thunks.
    getDefaultMiddleware({
      // immutableCheck: false,
      // serializableCheck: false,
    }).prepend(
      autosaveTilesetMiddleware,
      autosaveMapMiddleware,
      autosaveStoryMiddleware,
      mapSyncMiddleware,
      tileSyncMiddleware

      // collisionMiddleware
    ),
});

// Connects the store to page listeners, so that we can respond to the page
// being focused if we want to.
// setupListeners(store.dispatch);

export type RootState = ReturnType<typeof rootReducer>;
export type StoreType = typeof store;
export type AppDispatch = typeof store.dispatch;
