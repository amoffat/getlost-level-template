import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import dialogueReducer from "./slices/dialogue";
import mapEditorReducer from "./slices/mapEditor";
import tilesetEditorReducer from "./slices/tilesetEditor";

export const rootReducer = combineReducers({
  dialogue: dialogueReducer,
  tilesetEditor: tilesetEditorReducer,
  mapEditor: mapEditorReducer,
});

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    // We also add our middleware for the RTK Query API slices here, which
    // handle things like async thunks.
    getDefaultMiddleware().concat(),
});

// Connects the store to page listeners, so that we can respond to the page
// being focused if we want to.
setupListeners(store.dispatch);

export type RootState = ReturnType<typeof rootReducer>;
export type StoreType = typeof store;
export type AppDispatch = typeof store.dispatch;
