import { iconTsId, lightIcon, startIcon } from "@/constants";
import { globals as gApp } from "@/globals";
import { loadMap } from "@/persist/map/api";
import { actions as mapActions, selectors } from "@/slices/mapEditor";
import { actions as uiActions } from "@/slices/ui";
import { RootState } from "@/store/store";
import { Mode } from "@/types/editor";
import { MapLayerName } from "@/types/layer";
import { MapObj, TileGroupInstance } from "@/types/map";
import { mapLayerToName } from "@/utils/layer";
import { loadTileGroup } from "@/utils/tileset";
import { notifications } from "@mantine/notifications";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { globals as g } from "../editor/map/globals";

export const setActiveLayerThunk = createAsyncThunk(
  "mapEditor/setActiveLayerThunk",
  async (
    { layer, notify }: { layer: MapLayerName; notify?: boolean },
    { dispatch }
  ) => {
    dispatch(mapActions.setActiveLayer(layer));
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
    for (const id of persisted.ids) {
      const obj = persisted.entities[id];
      if (obj) objs.push(obj);
    }
    dispatch(mapActions.setAll(objs));
    dispatch(uiActions.popLoadingMessage());
  }
);

export const duplicateSelectionThunk = createAsyncThunk(
  "mapEditor/duplicateSelectionThunk",
  async (_, { dispatch, getState }) => {
    const state = getState() as RootState;
    const newObjs: MapObj[] = [];
    selectors.selectedObjs(state).forEach((obj) => {
      const newObj: MapObj = {
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
    dispatch(mapActions.setManySelected(newObjs.map((o) => o.id)));
    // Switch to "duplicate" mode which will allow immediate moving
    dispatch(mapActions.setMode("duplicate"));
  }
);

export const setToolThunk = createAsyncThunk(
  "mapEditor/setToolThunk",
  async (tool: Mode | null, { dispatch, getState }) => {
    const state = getState() as RootState;

    if (tool === null) {
      dispatch(mapActions.setMode("select"));
    } else {
      if (tool === "set-gateway") {
        const tg = loadTileGroup({
          id: startIcon,
          tilesetId: iconTsId,
        });
        dispatch(mapActions.setPlace(tg));
      } else if (tool === "add-light") {
        const tg = loadTileGroup({
          id: lightIcon,
          tilesetId: iconTsId,
        });
        dispatch(mapActions.setPlace(tg));
      } else if (tool === "paint") {
        const layer = state.mapEditor.layers.active;
        if (![MapLayerName.Ground, MapLayerName.World].includes(layer)) {
          const isTile = state.mapEditor.place.obj?.coverage === 1.0;
          const switchTo = isTile ? MapLayerName.Ground : MapLayerName.World;

          dispatch(setActiveLayerThunk({ layer: switchTo, notify: true }));
        }
      }
      dispatch(mapActions.pushMode(tool));
    }

    dispatch(mapActions.setActiveTool(tool));
  }
);

export const bringToTopThunk = createAsyncThunk(
  "mapEditor/bringToTopThunk",
  async (objs: TileGroupInstance[], { dispatch }) => {
    const changeList = [];

    for (const obj of objs) {
      const tg = gApp.tileIdToTileGroup.get(obj.tileId)!;
      const width = tg.pos.br.x - tg.pos.ul.x;
      const height = tg.pos.br.y - tg.pos.ul.y;
      const bounds = {
        minX: obj.x,
        minY: obj.y,
        maxX: obj.x + width,
        maxY: obj.y + height,
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
      const tg = gApp.tileIdToTileGroup.get(obj.tileId)!;
      const width = tg.pos.br.x - tg.pos.ul.x;
      const height = tg.pos.br.y - tg.pos.ul.y;
      const bounds = {
        minX: obj.x,
        minY: obj.y,
        maxX: obj.x + width,
        maxY: obj.y + height,
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
