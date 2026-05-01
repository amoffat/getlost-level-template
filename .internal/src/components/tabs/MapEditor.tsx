import { ItemStatus } from "@/components/modals/ItemizedConfirmModal";
import * as constants from "@/constants";
import { iconTsId, transparentIcon } from "@/constants/tsObjs";
import { globals as g } from "@/globals";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { useSpotlightActions } from "@/hooks/useSpotlightActions";
import { getMapInitPromise, resetMapCanvasInit } from "@/init/editorInit";
import { brokenTileGroups } from "@/selectors/map";
import { actions, selectors } from "@/slices/mapEditor";
import { RootState, store } from "@/store/store";
import { resetMapThunk, setPlaceThunk, setToolThunk } from "@/thunks/map";
import { isAnimationTemplate } from "@/types/animation";
import { Mode } from "@/types/editor";
import { MapLayerName } from "@/types/layer";
import { isNpcTemplate } from "@/types/npc";
import { isTileGroupTemplate } from "@/types/tilegroup";
import { Tileset } from "@/types/tileset";
import { TemplateObject } from "@/types/tilesetobject";
import { FillObj } from "@/types/tools";
import { animationsFilter, objectsFilter } from "@/utils/palette/filters";
import {
  npcSort,
  objectAnimationSort,
  tileGroupSort,
} from "@/utils/palette/sort";
import { loadTileGroup } from "@/utils/tileset";
import { Split } from "@gfazioli/mantine-split-pane";
import {
  Badge,
  Group,
  Portal,
  ScrollArea,
  Stack,
  Tabs,
  Text,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import {
  IconBrush,
  IconBucketDroplet,
  IconBulb,
  IconDoorExit,
  IconFrame,
  IconGift,
  IconMapPin,
  IconPaint,
  IconPhoto,
  IconPointer,
  IconTrash,
  IconUnlink,
  IconWand,
} from "@tabler/icons-react";
import {
  use,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { useTranslation } from "react-i18next";
import LayerList from "../LayerList";
import MapPositions from "../MapPositions";
import ObjectPalette from "../ObjectPalette";
import ObjSelHover from "../ObjSelHoverMenu";
import AnimationsPaletteFilters from "../paletteFilters/Animations";
import ObjectsPaletteFilters from "../paletteFilters/Objects";
import { renderNpc } from "../paletteObjects/Npc";
import { renderObjectAnimation } from "../paletteObjects/ObjectAnimation";
import { renderTileGroup } from "../paletteObjects/TileGroup";
import Tip from "../Tip";
import ToolPalette, { ToolDescriptor } from "../ToolPalette";
import AutotilerTool from "../tools/map/AutotilerTool";
import BackgroundTool from "../tools/map/BackgroundTool";
import FillTool from "../tools/map/FillTool";
import GatewayTool from "../tools/map/GatewayTool";
import MapBoundsTool from "../tools/map/MapBoundsTool";
import PaintTool from "../tools/map/PaintTool";
import PickupTool from "../tools/map/PickupTool";
import SelectTool from "../tools/map/SelectTool";
import ZonePaintTool from "../tools/map/ZonePaintTool";

// Created at module-evaluation time (outside React's render cycle) so any
// Redux dispatches inside the thunks don't fire while React is rendering.
const _hmrInitPromise: Promise<unknown> | null = import.meta.hot?.data
  ?.needsReinit
  ? getMapInitPromise()
  : null;

if (import.meta.hot) {
  import.meta.hot.dispose((data) => {
    // Detach the canvas from the DOM *before* destroying the app so the
    // browser never renders the "WebGL context lost" sad-face on a live canvas.
    g.mapEditorApp?.canvas.remove();
    resetMapCanvasInit();
    data.needsReinit = true;
  });
}

export default function MapEditorTab({
  initPromise,
}: {
  initPromise: Promise<unknown>;
}) {
  const activeTab = useAppSelector((state: RootState) => state.ui.activeTab);
  const selectedToolName = useAppSelector(
    (state: RootState) => state.mapEditor.activeTool,
  );
  const paletteSelection = useAppSelector(selectors.paletteSelectedTsObjIds);
  const tilesets = useAppSelector(
    (state: RootState) => state.tilesetEditor.tilesets,
  );
  const placeObj = useAppSelector(
    (state: RootState) => state.mapEditor.place.obj,
  );
  const containerRef = useRef<HTMLDivElement>(null);

  // Defer visual updates to palette selection to keep interactions responsive
  const deferredPaletteSelection = useDeferredValue(paletteSelection);

  // Derive counts from palette selection - memoized to avoid re-renders
  const selCounts = useMemo(() => {
    const counts = { objects: 0, animations: 0, npcs: 0 };

    // Build a lookup from tsObjId to template type
    const tilesetsArr: Tileset[] = Object.values(tilesets);

    for (const tsObjId of paletteSelection) {
      // Check if this is the placeObj first
      if (placeObj && placeObj.id === tsObjId) {
        if (isTileGroupTemplate(placeObj)) {
          counts.objects++;
        } else if (isAnimationTemplate(placeObj)) {
          counts.animations++;
        } else if (isNpcTemplate(placeObj)) {
          counts.npcs++;
        }
        continue;
      }

      // Look up in tilesets
      for (const ts of tilesetsArr) {
        const template = ts.tiles.entities[tsObjId];
        if (template) {
          if (isTileGroupTemplate(template)) {
            counts.objects++;
          } else if (isAnimationTemplate(template)) {
            counts.animations++;
          } else if (isNpcTemplate(template)) {
            counts.npcs++;
          }
          break;
        }
      }
    }

    return counts;
  }, [paletteSelection, tilesets, placeObj]);

  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  // Register map-editor spotlight actions
  const mapSpotlightActions = useMemo(
    () => [
      {
        id: "clear-broken",
        label: t("mapEditorClearBrokenLabel"),
        description: t("mapEditorClearBrokenDescription"),
        onClick: () => {
          modals.openContextModal({
            modal: "confirm",
            title: t("mapEditorClearBrokenTitle"),
            centered: true,
            withCloseButton: true,
            innerProps: {
              makeItems: () => {
                const items: ItemStatus[] = [];
                const state = store.getState();
                const broken = brokenTileGroups(state);
                items.push({
                  ok: broken.length === 0,
                  message:
                    broken.length === 0
                      ? t("mapEditorNoBrokenTilesFound")
                      : t("mapEditorFoundBrokenTiles", {
                          count: broken.length,
                        }),
                });
                return items;
              },
              confirmLabel: t("mapEditorClearBrokenConfirmLabel"),
              msg: t("mapEditorClearBrokenMsg"),
              onConfirm: () => {},
            },
          });
        },
        leftSection: <IconUnlink />,
      },
      {
        id: "reset-map",
        label: t("mapEditorResetMapLabel"),
        description: t("mapEditorResetMapDescription"),
        onClick: () => {
          modals.openConfirmModal({
            title: t("mapEditorResetMapTitle"),
            children: <Text size="sm">{t("mapEditorResetMapBody")}</Text>,
            labels: {
              confirm: t("mapEditorResetMapConfirm"),
              cancel: t("mapEditorCancel"),
            },
            confirmProps: { color: "red" },
            centered: true,
            withCloseButton: false,
            onConfirm: () => dispatch(resetMapThunk()),
          });
        },
        leftSection: <IconTrash />,
      },
    ],
    [dispatch, t],
  );
  useSpotlightActions(
    "map-editor",
    mapSpotlightActions,
    activeTab === "map-editor",
  );

  use(_hmrInitPromise ?? initPromise);

  useEffect(() => {
    const container = containerRef.current!;
    const canvas = g.mapEditorApp!.canvas;

    if (!container.contains(canvas)) {
      container.appendChild(canvas);
    }

    // Set resizeTo after a frame to ensure the container has its final size
    requestAnimationFrame(() => {
      g.mapEditorApp!.resizeTo = container;
    });
  }, []);

  const onSelectObject = useCallback(
    async (obj: TemplateObject, e: React.MouseEvent) => {
      if (e.button === 2) return;

      const state = store.getState();
      const mode = selectors.selectMode(state);

      if (mode === "fill" && isTileGroupTemplate(obj)) {
        const curCands = state.mapEditor.toolOptions.fill.candidates;
        if (curCands.find((c) => c.tg.id === obj.id)) {
          // Already selected
          return;
        }

        const toAdd: FillObj[] = [];
        if (curCands.length === 0) {
          const transparentTg = loadTileGroup({
            id: transparentIcon,
            tilesetId: iconTsId,
          });
          toAdd.push({
            tg: transparentTg,
            prob: 0.5,
            canRemove: false,
          });
        }

        toAdd.push({
          tg: obj,
          prob: 0.5,
          canRemove: true,
        });

        dispatch(
          actions.setToolOptions({
            tool: "fill",
            options: {
              candidates: [...curCands, ...toAdd],
            },
          }),
        );
      } else {
        await dispatch(setPlaceThunk(obj)).unwrap();
      }
    },
    [dispatch],
  );

  const onDeselectObject = useCallback(() => {
    dispatch(actions.setPlace(null));
    dispatch(setToolThunk(null));
  }, [dispatch]);

  const handlePaneResize = () => {
    // Trigger redrawLayout when panels are resized
    // Use a small delay to ensure the DOM has updated
    requestAnimationFrame(() => {
      window.dispatchEvent(new Event("resize"));
    });
  };

  const toolPalette: Partial<Record<Mode, ToolDescriptor>> = useMemo(
    () =>
      ({
        select: {
          name: t("mapEditorSelectMoveTool"),
          icon: <IconPointer size={16} />,
          options: <SelectTool />,
        },
        paint: {
          name: t("mapEditorPaintAreaTool"),
          icon: <IconPaint size={16} />,
          layerConstraints: [MapLayerName.Exterior, MapLayerName.Ground],
          options: <PaintTool />,
        },
        autotiler: {
          name: t("mapEditorAutotilerTool"),
          icon: <IconWand size={16} />,
          layerConstraints: [MapLayerName.Ground],
          options: <AutotilerTool />,
        },
        fill: {
          name: t("mapEditorFillAreaTool"),
          icon: <IconBucketDroplet size={16} />,
          layerConstraints: [MapLayerName.Exterior, MapLayerName.Ground],
          options: <FillTool />,
        },
        "set-gateway": {
          name: t("mapEditorAddGatewayTool"),
          icon: <IconDoorExit size={16} />,
          layerConstraints: [MapLayerName.Special],
          options: <GatewayTool />,
        },
        "set-waypoint": {
          name: t("mapEditorSetWaypointTool"),
          icon: <IconMapPin size={16} />,
          layerConstraints: [MapLayerName.Special],
        },
        "paint-zone": {
          name: t("mapEditorZoneTool"),
          icon: <IconBrush size={16} />,
          layerConstraints: [MapLayerName.Sensors],
          options: <ZonePaintTool />,
        },

        "add-light": {
          name: t("mapEditorAddLightTool"),
          icon: <IconBulb size={16} />,
          layerConstraints: [MapLayerName.Special],
        },
        "add-pickup": {
          name: t("mapEditorAddPickupTool"),
          icon: <IconGift size={16} />,
          layerConstraints: [MapLayerName.Special],
          options: <PickupTool />,
        },
        "set-bounds": {
          name: t("mapEditorSetBoundsTool"),
          icon: <IconFrame size={16} />,
          options: <MapBoundsTool />,
        },
        "add-background-image": {
          name: t("mapEditorBackgroundImagesTool"),
          icon: <IconPhoto size={16} />,
          layerConstraints: [MapLayerName.Background],
          options: <BackgroundTool />,
        },
      }) satisfies Partial<Record<Mode, ToolDescriptor>>,
    [t],
  );

  const tool = selectedToolName && toolPalette[selectedToolName];
  const toolOptions = tool?.options;

  const onToolActivated = useCallback(
    (slug: string) => {
      dispatch(setToolThunk(slug as Mode)).unwrap();
    },
    [dispatch],
  );

  const onToolDeactivated = useCallback(() => {
    dispatch(setToolThunk(null)).unwrap();
  }, [dispatch]);

  const tips: string[] = useMemo(() => {
    const tips: string[] = [];

    if (!tool) {
      tips.push(t("mapEditorSelectToolTip"));
    }
    return tips;
  }, [tool, t]);

  const objectsBadge = <SelectedBadge count={selCounts.objects} />;
  const animationsBadge = <SelectedBadge count={selCounts.animations} />;
  const npcsBadge = <SelectedBadge count={selCounts.npcs} />;

  return (
    <>
      <Split h="100dvh" style={{ flex: 1 }}>
        {/* Left toolbar */}
        <Split.Pane
          initialWidth={300}
          minWidth={200}
          maxWidth={500}
          onResizeEnd={handlePaneResize}
        >
          <Stack h="100%" style={{ overflow: "hidden" }}>
            <LayerList layerConstraints={tool?.layerConstraints} />
          </Stack>
        </Split.Pane>

        <Split.Resizer />

        {/* Center panel with editor and palette */}
        <Split.Pane grow>
          <Split
            orientation="horizontal"
            style={{
              height: "100%",
              minHeight: 0,
              minWidth: 0,
              position: "relative",
            }}
          >
            {/* Top: Editor canvas */}
            <Split.Pane grow minHeight={200} onResizeEnd={handlePaneResize}>
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  height: "100%",
                }}
              >
                <div
                  ref={containerRef}
                  id={constants.mapEditorContainerId}
                  style={{
                    width: "100%",
                    height: "100%",
                    overflow: "hidden",
                  }}
                ></div>
                <MapPositions />
              </div>
            </Split.Pane>

            <Split.Resizer />

            {/* Bottom: Object palette */}
            <Split.Pane
              initialHeight={400}
              minHeight={150}
              maxHeight={600}
              onResizeEnd={handlePaneResize}
            >
              <Stack style={{ height: "100%" }} p={0}>
                <Tabs defaultValue={"objects"} className="flex-overflow">
                  <Tabs.List>
                    <Tabs.Tab value="objects">
                      <Group gap="xs">
                        {t("mapEditorObjectsTab")}
                        {objectsBadge}
                      </Group>
                    </Tabs.Tab>
                    <Tabs.Tab value="animations">
                      <Group gap="xs">
                        {t("mapEditorAnimationsTab")}
                        {animationsBadge}
                      </Group>
                    </Tabs.Tab>
                    <Tabs.Tab value="npcs">
                      <Group gap="xs">
                        {t("mapEditorNpcsTab")}
                        {npcsBadge}
                      </Group>
                    </Tabs.Tab>
                  </Tabs.List>
                  <Tabs.Panel
                    value="objects"
                    style={{
                      flex: 1,
                      minHeight: 0,
                      height: "100%",
                      display: "flex",
                    }}
                  >
                    <ObjectPalette
                      onSelectObject={onSelectObject}
                      onDeselectObject={onDeselectObject}
                      selectedObjects={deferredPaletteSelection}
                      filter={objectsFilter}
                      renderObject={renderTileGroup}
                      sort={tileGroupSort}
                      filterMenu={<ObjectsPaletteFilters />}
                    />
                  </Tabs.Panel>
                  <Tabs.Panel
                    value="animations"
                    style={{
                      flex: 1,
                      minHeight: 0,
                      height: "100%",
                      display: "flex",
                    }}
                  >
                    <ObjectPalette
                      minScale={1}
                      defaultScale={4}
                      maxScale={8}
                      onSelectObject={onSelectObject}
                      onDeselectObject={onDeselectObject}
                      selectedObjects={deferredPaletteSelection}
                      filter={animationsFilter}
                      renderObject={renderObjectAnimation}
                      sort={objectAnimationSort}
                      filterMenu={<AnimationsPaletteFilters />}
                    />
                  </Tabs.Panel>

                  <Tabs.Panel
                    value="npcs"
                    style={{
                      flex: 1,
                      minHeight: 0,
                      height: "100%",
                      display: "flex",
                    }}
                  >
                    <ObjectPalette
                      minScale={1}
                      defaultScale={4}
                      maxScale={8}
                      onSelectObject={onSelectObject}
                      onDeselectObject={onDeselectObject}
                      selectedObjects={deferredPaletteSelection}
                      filter={isNpcTemplate}
                      renderObject={renderNpc}
                      sort={npcSort}
                    />
                  </Tabs.Panel>
                </Tabs>
              </Stack>
            </Split.Pane>
          </Split>
        </Split.Pane>

        <Split.Resizer />

        {/* Right toolbar */}
        <Split.Pane
          initialWidth={300}
          minWidth={200}
          maxWidth={500}
          onResizeEnd={handlePaneResize}
        >
          <Stack h="100%" style={{ overflow: "hidden" }} pb="xl">
            <ToolPalette
              tools={toolPalette}
              activeTool={selectedToolName}
              onToolActivated={onToolActivated}
              onToolDeactivated={onToolDeactivated}
            />

            <Tip tips={tips} />
            <ScrollArea type="never" style={{ flex: 1 }}>
              <Stack p={0} pb="xl">
                {toolOptions}
              </Stack>
            </ScrollArea>
          </Stack>
        </Split.Pane>
      </Split>

      <Portal>
        <ObjSelHover />
      </Portal>
    </>
  );
}

const SelectedBadge = ({ count }: { count: number }) => {
  return (
    <Badge
      size="sm"
      circle
      color="lime.4"
      autoContrast
      style={{ visibility: count > 0 ? "visible" : "hidden" }}
    >
      {count}
    </Badge>
  );
};
