import { iconTsId, lightIcon, waypointIcon } from "@/constants/tsObjs";
import { loadMap } from "@/persist/map/api";
import { router } from "@/router";
import { actions as mapActions, selectors } from "@/slices/mapEditor";
import { selectors as tsSelectors } from "@/slices/tilesetEditor";
import { actions as uiActions } from "@/slices/ui";
import { RootState } from "@/store/store";
import { Mode } from "@/types/editor";
import { MapLayerName } from "@/types/layer";
import { isMapObjFromTileset, MapObj, TileGroupInstance } from "@/types/map";
import { mapLayerToName } from "@/utils/layer";
import { loadTileGroup } from "@/utils/tileset";
import { notifications } from "@mantine/notifications";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { globals as g } from "../editors/map/globals";
import { removeTilesetThunk } from "./tileset";

export const setActiveLayerThunk = createAsyncThunk(
  "mapEditor/setActiveLayerThunk",
  async (
    { layer, notify }: { layer: MapLayerName; notify?: boolean },
    { dispatch, getState }
  ) => {
    const state = getState() as RootState;
    if (state.mapEditor.layers.active === layer) return;

    dispatch(mapActions.setActiveLayer(layer));
    dispatch(mapActions.setLockInactiveLayer(true));
    const name = mapLayerToName(layer);
    if (notify) {
      notifications.show({
        title: "Layer switched",
        message: `You're now editing the "${name}" layer.`,
        autoClose: 3000,
      });
    }
  }
);

export const loadMapThunk = createAsyncThunk(
  "map/loadMapThunk",
  async (_: void, { dispatch }) => {
    dispatch(uiActions.pushLoadingMessage(`Loading map...`));
    const persisted = await loadMap();
    const objs: MapObj[] = [];
    for (const id of persisted.objects.ids) {
      const obj = persisted.objects.entities[id];
      if (obj) objs.push(obj);
    }
    dispatch(mapActions.setAll(objs));
    dispatch(uiActions.popLoadingMessage());
  }
);

export const resetMapThunk = createAsyncThunk(
  "mapEditor/resetMapThunk",
  async (_, { dispatch }) => {
    dispatch(uiActions.pushLoadingMessage("Resetting map..."));
    dispatch(mapActions.setAll([]));
    dispatch(uiActions.popLoadingMessage());
    notifications.show({
      title: "Map reset",
      message: "The map has been cleared.",
      autoClose: 3000,
    });
    router.navigate("/map");
  }
);

export const resetAllThunk = createAsyncThunk(
  "mapEditor/resetAllThunk",
  async (_, { dispatch, getState }) => {
    const state = getState() as RootState;

    dispatch(uiActions.pushLoadingMessage("Resetting all data..."));
    dispatch(resetMapThunk());
    for (const tsId of state.tilesetEditor.tilesetIds) {
      dispatch(removeTilesetThunk(tsId));
    }
    // TODO Potentially other slices to reset in the future
    dispatch(uiActions.popLoadingMessage());
    notifications.show({
      title: "All data reset",
      message: "All data has been cleared.",
      autoClose: 3000,
    });
    router.navigate("/");
  }
);

export const duplicateSelectionThunk = createAsyncThunk(
  "mapEditor/duplicateSelectionThunk",
  async (_, { dispatch, getState }) => {
    const state = getState() as RootState;
    const newObjs: MapObj[] = [];
    selectors.selectedObjs(state).forEach((obj) => {
      let gridSize = state.mapEditor.grid.size;
      if (isMapObjFromTileset(obj)) {
        const tmpl = tsSelectors.templateFromInstanceId(state, obj.tsObjId);
        gridSize = tmpl?.gridSize ?? gridSize;
      }

      const newObj: MapObj = {
        ...obj,
        id: crypto.randomUUID(),
        x: obj.x + gridSize.x,
        y: obj.y + gridSize.y,
        z: obj.z + gridSize.y,
      };
      newObjs.push(newObj);
    });
    // Duplicate the objects
    dispatch(mapActions.addMany(newObjs));
    // Select the new objects
    dispatch(mapActions.setManySelected(newObjs.map((o) => o.id)));
    // Switch to "duplicate" mode which will allow immediate moving
    dispatch(mapActions.setMode("duplicate"));
  }
);

export const setToolThunk = createAsyncThunk(
  "mapEditor/setToolThunk",
  async (tool: Mode | null, { dispatch }) => {
    if (tool === null) tool = "select";
    dispatch(clearUncommittedThunk());
    dispatch(mapActions.clearSelection());

    if (tool === "add-light") {
      const tg = loadTileGroup({
        id: lightIcon,
        tilesetId: iconTsId,
      });
      dispatch(mapActions.setPlace(tg));
    } else if (tool === "set-waypoint") {
      const tg = loadTileGroup({
        id: waypointIcon,
        tilesetId: iconTsId,
      });
      dispatch(mapActions.setPlace(tg));
    } else if (tool === "paint") {
      dispatch(mapActions.clearSelection());
    }

    dispatch(mapActions.setMode(tool));
    dispatch(mapActions.setActiveTool(tool));
  }
);

export const bringToTopThunk = createAsyncThunk(
  "mapEditor/bringToTopThunk",
  async (objs: TileGroupInstance[], { dispatch }) => {
    const changeList = [];

    for (const obj of objs) {
      const bounds = {
        minX: obj.x,
        minY: obj.y,
        maxX: obj.x + obj.width,
        maxY: obj.y + obj.height,
      };

      const hits = g.spatialIndex.getObjects({ pos: bounds });
      const maxZ = hits
        .filter((o) => o.id !== obj.id)
        .map((o) => o.z)
        .reduce((max, z) => Math.max(max, z), Number.NEGATIVE_INFINITY);

      changeList.push({
        id: obj.id,
        changes: { z: maxZ + 1 },
      });
    }

    dispatch(mapActions.updateMany(changeList));
  }
);

export const sendToBottomThunk = createAsyncThunk(
  "mapEditor/sendToBottomThunk",
  async (objs: TileGroupInstance[], { dispatch }) => {
    const changeList = [];

    for (const obj of objs) {
      const bounds = {
        minX: obj.x,
        minY: obj.y,
        maxX: obj.x + obj.width,
        maxY: obj.y + obj.height,
      };

      const hits = g.spatialIndex.getObjects({ pos: bounds });
      const minZ = hits
        .filter((o) => o.id !== obj.id)
        .map((o) => o.z)
        .reduce((min, z) => Math.min(min, z), Number.POSITIVE_INFINITY);

      changeList.push({
        id: obj.id,
        changes: { z: minZ - 1 },
      });
    }

    dispatch(mapActions.updateMany(changeList));
  }
);

export const setUncommittedObjIdsThunk = createAsyncThunk(
  "mapEditor/setUncommittedObjIdsThunk",
  async (obs: MapObj[], { dispatch }) => {
    await dispatch(clearUncommittedThunk()).unwrap();
    dispatch(mapActions.setUncommittedObjIds(obs.map((o) => o.id)));
    dispatch(mapActions.addMany(obs));
  }
);

export const clearUncommittedThunk = createAsyncThunk(
  "mapEditor/clearUncommittedThunk",
  async (_, { dispatch, getState }) => {
    const state = getState() as RootState;
    const uncommitted = state.mapEditor.uncommittedObjIds;
    if (uncommitted.length) {
      dispatch(mapActions.removeMany(uncommitted));
    }
  }
);

export const commitObjectsThunk = createAsyncThunk(
  "mapEditor/commitObjectsThunk",
  async (_, { dispatch }) => {
    dispatch(mapActions.setUncommittedObjIds([]));
  }
);
