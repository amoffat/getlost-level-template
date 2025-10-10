import { loadMap } from "@/persist/map/api";
import { actions as mapActions } from "@/slices/map";
import {
  actions as mapEdActions,
  selectors as mapEdSelectors,
} from "@/slices/mapEditor";
import { actions as uiActions } from "@/slices/ui";
import { RootState } from "@/store/store";
import { MapObj, Mode, TileGroupInstance } from "@/types/editor";
import { createAsyncThunk } from "@reduxjs/toolkit";

export const loadMapThunk = createAsyncThunk(
  "map/loadMapThunk",
  async (_: void, { dispatch }) => {
    dispatch(uiActions.setLoadingMessage(`Loading map...`));
    const persisted = await loadMap();
    const objs: (MapObj | TileGroupInstance)[] = [];
    for (const id of persisted.ids) {
      const obj = persisted.entities[id];
      if (obj) objs.push(obj);
    }
    dispatch(mapActions.setAll(objs));
  }
);

export const duplicateSelectionThunk = createAsyncThunk(
  "mapEditor/duplicateSelectionThunk",
  async (_, { dispatch, getState }) => {
    const state = getState() as RootState;
    const newObjs: TileGroupInstance[] = [];
    mapEdSelectors.selection.selectAll(state.mapEditor).forEach((obj) => {
      const newObj: TileGroupInstance = {
        ...obj,
        id: crypto.randomUUID(),
        x: obj.x + 16,
        y: obj.y + 16,
        z: obj.z + 16,
      };
      newObjs.push(newObj);
    });
    // Duplicate the objects
    dispatch(mapActions.addMany(newObjs));
    // Select the new objects
    dispatch(mapEdActions.setManySelected(newObjs));
    // Switch to "duplicate" mode which will allow immediate moving
    dispatch(mapEdActions.setMode("duplicate"));
  }
);

export const setToolThunk = createAsyncThunk(
  "mapEditor/setToolThunk",
  async (tool: Mode | null, { dispatch }) => {
    dispatch(mapEdActions.setActiveTool(tool));

    if (tool === null) {
      dispatch(mapEdActions.setMode("select"));
    } else {
      dispatch(mapEdActions.pushMode(tool));
    }
  }
);
