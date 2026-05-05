import { iconTsId, lightIcon, waypointIcon } from "@/constants/tsObjs";
import { globals as gApp } from "@/globals";
import { fetchBackgroundImageUrl } from "@/persist/background/api";
import { loadMap } from "@/persist/map/api";
import { fetchSpeakerImageUrl as fetchSpeakerImageBlob } from "@/persist/speakerImage/api";
import { router } from "@/router";
import { actions as mapActions, selectors } from "@/slices/mapEditor";
import { selectors as tsSelectors } from "@/slices/tilesetEditor";
import { actions as uiActions } from "@/slices/ui";
import { RootState } from "@/store/store";
import { Mode } from "@/types/editor";
import { MapLayerName } from "@/types/layer";
import {
  isAnimatedInstance,
  isBackgroundImageObj,
  isMapObjFromTileset,
  isNpcInstance,
  isTileGroupInstance,
  isZoneObj,
  MapObj,
  TileGroupInstance,
} from "@/types/map";
import { TemplateObject } from "@/types/tilesetobject";
import { mapLayerToName } from "@/utils/layer";
import { loadTileGroup } from "@/utils/tileset";
import { Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { createAsyncThunk } from "@reduxjs/toolkit";
import i18n from "i18next";
import * as P from "pixi.js";
import { globals as g } from "../editors/map/globals";
import { resetStoryThunk } from "./story";
import { removeTilesetThunk } from "./tileset";

export const setActiveLayerThunk = createAsyncThunk(
  "mapEditor/setActiveLayerThunk",
  async (
    { layer, notify }: { layer: MapLayerName; notify?: boolean },
    { dispatch, getState },
  ) => {
    const state = getState() as RootState;
    if (state.mapEditor.layers.active === layer) return;

    const name = mapLayerToName(layer);

    // Should we move selected objects to the layer?
    if (layer === MapLayerName.Ground || layer === MapLayerName.Exterior) {
      const selectedObjs = selectors
        .selectedObjs(state)
        .filter(isTileGroupInstance);

      if (selectedObjs.length > 0) {
        modals.openConfirmModal({
          title: i18n.t("layerMoveModalTitle"),
          centered: true,
          children: (
            <Text size="sm">
              {i18n.t("layerMoveModalBody", {
                count: selectedObjs.length,
                name,
              })}
            </Text>
          ),
          onConfirm: () => {
            dispatch(
              mapActions.updateMany(
                selectedObjs.map((obj) => ({
                  id: obj.id,
                  changes: { layer },
                })),
              ),
            );
          },
          labels: {
            confirm: i18n.t("moveObjects"),
            cancel: i18n.t("no"),
          },
        });
      }
    }

    dispatch(mapActions.setActiveLayer(layer));
    dispatch(mapActions.setLockInactiveLayer(true));

    if (notify) {
      notifications.show({
        title: i18n.t("mapLayerSwitched"),
        message: i18n.t("mapLayerSwitchedMessage", { name }),
        autoClose: 3000,
      });
    }
  },
);

export const loadMapThunk = createAsyncThunk(
  "map/loadMapThunk",
  async (_: void, { dispatch }) => {
    dispatch(uiActions.pushLoadingMessage(i18n.t("mapLoading")));
    const persisted = await loadMap();
    if (persisted) {
      const objs: MapObj[] = [];
      for (const id of persisted.objects.ids) {
        const obj = persisted.objects.entities[id];
        if (obj) objs.push(obj);
      }

      // Pre-populate the background image caches before dispatching objects so
      // the reconciler can render them on first flush.
      const bgObjs = objs.filter(isBackgroundImageObj);
      const seenImageIds = new Set<string>();
      await Promise.all(
        bgObjs.map(async (obj) => {
          if (seenImageIds.has(obj.imageId)) return;
          seenImageIds.add(obj.imageId);
          const objectUrl = await fetchBackgroundImageUrl(obj.imageId);
          gApp.backgroundImageObjectUrlCache.set(obj.imageId, objectUrl);
          const tex = await P.Assets.load<P.Texture>({
            src: objectUrl,
            parser: "loadTextures",
          });
          const canvas = new P.CanvasSource({
            width: tex.source.width,
            height: tex.source.height,
          });
          canvas.context2D.drawImage(
            (tex.source as any).resource as CanvasImageSource,
            0,
            0,
          );
          canvas.update();
          canvas.scaleMode = "nearest";
          gApp.backgroundImageCache.set(obj.imageId, canvas);
        }),
      );

      // Zones should only ever be hidden during editing (because the mask is
      // active then). But sometimes a zone can be hidden and the app crash,
      // leaving them permanently hidden. Not good, so make sure they're never
      // hidden on load.
      const zones = objs.filter(isZoneObj);
      zones.forEach((zone) => {
        zone.hidden = false;
      });

      dispatch(mapActions.setAll(objs));
      dispatch(mapActions.setBounds(persisted.bounds));
      if (persisted.card) {
        dispatch(mapActions.setCard(persisted.card));
      }

      // Pre-populate the speaker image blob-URL cache for any NPC, tile group,
      // or animation instances that have a speakerImageId.
      const seenSpeakerIds = new Set<string>();
      await Promise.all(
        objs
          .filter(
            (o) =>
              isNpcInstance(o) ||
              isTileGroupInstance(o) ||
              isAnimatedInstance(o),
          )
          .map(async (obj) => {
            const imageId = obj.speakerImageId;
            if (!imageId || seenSpeakerIds.has(imageId)) return;
            seenSpeakerIds.add(imageId);
            try {
              const blob = await fetchSpeakerImageBlob(imageId);
              gApp.speakerImageObjectUrlCache.set(imageId, blob);
            } catch {
              // Non-fatal: image may have been deleted
            }
          }),
      );
    }
    dispatch(uiActions.popLoadingMessage());
  },
);

export const resetMapThunk = createAsyncThunk(
  "mapEditor/resetMapThunk",
  async (_, { dispatch }) => {
    dispatch(uiActions.pushLoadingMessage(i18n.t("mapResetting")));
    dispatch(mapActions.setAll([]));
    dispatch(uiActions.popLoadingMessage());
    notifications.show({
      title: i18n.t("mapReset"),
      message: i18n.t("mapResetMessage"),
      autoClose: 3000,
    });
    router.navigate("/map");
  },
);

export const resetAllThunk = createAsyncThunk(
  "mapEditor/resetAllThunk",
  async (_, { dispatch, getState }) => {
    const state = getState() as RootState;

    dispatch(uiActions.pushLoadingMessage(i18n.t("mapResetAllLoading")));

    await dispatch(resetStoryThunk()).unwrap();
    await dispatch(resetMapThunk()).unwrap();
    for (const tsId of state.tilesetEditor.tilesetIds) {
      await dispatch(removeTilesetThunk(tsId)).unwrap();
    }

    // TODO Potentially other slices to reset in the future
    dispatch(uiActions.popLoadingMessage());
    notifications.show({
      title: i18n.t("mapAllDataReset"),
      message: i18n.t("mapAllDataResetMessage"),
      autoClose: 3000,
    });
    router.navigate("/");
  },
);

export const duplicateSelectionThunk = createAsyncThunk(
  "mapEditor/duplicateSelectionThunk",
  async (_, { dispatch, getState }) => {
    const state = getState() as RootState;
    const newObjs: MapObj[] = [];
    selectors.selectedObjs(state).forEach((obj) => {
      let gridSize = state.mapEditor.grid.size;
      if (isMapObjFromTileset(obj)) {
        const tmpl = tsSelectors.templateFromId(state, obj.tsObjId);
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
  },
);

export const setToolThunk = createAsyncThunk(
  "mapEditor/setToolThunk",
  async (tool: Mode | null, { dispatch }) => {
    if (tool === null) tool = "select";
    await dispatch(clearUncommittedThunk()).unwrap();

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
    }

    dispatch(mapActions.setMode(tool));
    dispatch(mapActions.setActiveTool(tool));
  },
);

/** The layers on which the paint tool (and palette-placed objects) are valid. */
const paintLayerConstraints = [MapLayerName.Exterior, MapLayerName.Ground];

/**
 * Sets the place object from the palette, switching to the paint tool and
 * auto-correcting the active layer if it is not valid for painting.
 */
export const setPlaceThunk = createAsyncThunk(
  "mapEditor/setPlaceThunk",
  async (obj: TemplateObject, { dispatch, getState }) => {
    await dispatch(setToolThunk("paint")).unwrap();

    const state = getState() as RootState;
    const curLayer = state.mapEditor.layers.active;
    if (!paintLayerConstraints.includes(curLayer)) {
      await dispatch(
        setActiveLayerThunk({
          layer: paintLayerConstraints[0],
          notify: true,
        }),
      ).unwrap();
    }

    dispatch(mapActions.setPlace(obj));
  },
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
  },
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
  },
);

export const setUncommittedObjIdsThunk = createAsyncThunk(
  "mapEditor/setUncommittedObjIdsThunk",
  async (obs: MapObj[], { dispatch }) => {
    await dispatch(clearUncommittedThunk()).unwrap();
    dispatch(mapActions.setUncommittedObjIds(obs.map((o) => o.id)));
    dispatch(mapActions.addMany(obs));
  },
);

export const clearUncommittedThunk = createAsyncThunk(
  "mapEditor/clearUncommittedThunk",
  async (_, { dispatch, getState }) => {
    const state = getState() as RootState;
    const uncommitted = state.mapEditor.uncommittedObjIds;
    if (uncommitted.length) {
      dispatch(mapActions.removeMany(uncommitted));
    }
  },
);

export const commitObjectsThunk = createAsyncThunk(
  "mapEditor/commitObjectsThunk",
  async (_, { dispatch }) => {
    dispatch(mapActions.setUncommittedObjIds([]));
  },
);
