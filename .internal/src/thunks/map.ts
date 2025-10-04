import { actions as mapActions } from "@/slices/map";
import {
  actions as mapEdActions,
  selectors as mapEdSelectors,
} from "@/slices/mapEditor";
import { RootState } from "@/store/store";
import { Mode, TileGroupInstance } from "@/types/editor";
import { createAsyncThunk } from "@reduxjs/toolkit";

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
  async (tool: Mode | null, { dispatch, getState }) => {
    const state = getState() as RootState;
    const currentMode = mapEdSelectors.selectMode(state);

    dispatch(mapEdActions.setActiveTool(tool));

    if (tool === null) {
      dispatch(mapEdActions.setMode(null));
    } else {
      dispatch(mapEdActions.pushMode(tool));
    }
  }
);
