import * as constants from "@/constants";
import { iconTsId, transparentIcon } from "@/constants/tsObjs";
import { globals as g } from "@/globals";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { actions, selectors } from "@/slices/mapEditor";
import { RootState, store } from "@/store/store";
import { setToolThunk } from "@/thunks/map";
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
import { Badge, Group, Portal, ScrollArea, Stack, Tabs } from "@mantine/core";
import {
  IconBucketDroplet,
  IconBulb,
  IconCameraSearch,
  IconCarCrash,
  IconDoorExit,
  IconEar,
  IconGift,
  IconInputSpark,
  IconMapPin,
  IconPaint,
  IconPointer,
  IconRipple,
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
import LayerList from "./LayerList";
import ObjectPalette from "./ObjectPalette";
import ObjSelHover from "./ObjSelHoverMenu";
import AnimationsPaletteFilters from "./paletteFilters/Animations";
import ObjectsPaletteFilters from "./paletteFilters/Objects";
import { renderNpc } from "./paletteObjects/Npc";
import { renderObjectAnimation } from "./paletteObjects/ObjectAnimation";
import { renderTileGroup } from "./paletteObjects/TileGroup";
import PositionsFieldset from "./PositionsFieldset";
import Tip from "./Tip";
import ToolPalette, { ToolDescriptor } from "./ToolPalette";
import AutotilerTool from "./tools/map/AutotilerTool";
import ColliderTool from "./tools/map/ColliderTool";
import FillTool from "./tools/map/FillTool";
import GatewayTool from "./tools/map/GatewayTool";
import PaintTool from "./tools/map/PaintTool";
import PickupTool from "./tools/map/PickupTool";
import SelectTool from "./tools/map/SelectTool";

export default function MapEditorTab({
  initPromise,
}: {
  initPromise: Promise<unknown>;
}) {
  const selectedToolName = useAppSelector(
    (state: RootState) => state.mapEditor.selectedTool,
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

  // This waits for our tileset and map to load from the shell.
  use(initPromise);

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
    (obj: TemplateObject, e: React.MouseEvent) => {
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
        dispatch(actions.setPlace(obj));
        dispatch(setToolThunk("paint"));
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
          name: "Select/move",
          icon: <IconPointer size={16} />,
          options: <SelectTool />,
        },
        paint: {
          name: "Paint area",
          icon: <IconPaint size={16} />,
          layerConstraints: [MapLayerName.Exterior, MapLayerName.Ground],
          options: <PaintTool />,
        },
        autotiler: {
          name: "Autotiler",
          icon: <IconWand size={16} />,
          layerConstraints: [MapLayerName.Ground],
          options: <AutotilerTool />,
        },
        fill: {
          name: "Fill area",
          icon: <IconBucketDroplet size={16} />,
          layerConstraints: [MapLayerName.Exterior, MapLayerName.Ground],
          options: <FillTool />,
        },
        "set-gateway": {
          name: "Add gateway",
          icon: <IconDoorExit size={16} />,
          layerConstraints: [MapLayerName.Special],
          options: <GatewayTool />,
        },
        "set-waypoint": {
          name: "Set waypoint",
          icon: <IconMapPin size={16} />,
          layerConstraints: [MapLayerName.Special],
        },
        "add-collider": {
          name: "Add collider",
          icon: <IconCarCrash size={16} />,
          layerConstraints: [MapLayerName.Sensors],
          options: <ColliderTool />,
        },

        "set-sensor-zone": {
          name: "Sensor zone",
          icon: <IconInputSpark size={16} />,
          layerConstraints: [MapLayerName.Sensors],
        },
        "set-sink-zone": {
          name: "Sink zone",
          icon: <IconRipple size={16} />,
          layerConstraints: [MapLayerName.Sensors],
        },
        "set-sound-zone": {
          name: "Sound zone",
          icon: <IconEar size={16} />,
          layerConstraints: [MapLayerName.Sensors],
        },
        "set-zoom-zone": {
          name: "Zoom zone",
          icon: <IconCameraSearch size={16} />,
          layerConstraints: [MapLayerName.Sensors],
        },
        "add-light": {
          name: "Add light",
          icon: <IconBulb size={16} />,
          layerConstraints: [MapLayerName.Special],
        },
        "add-pickup": {
          name: "Add pickup",
          icon: <IconGift size={16} />,
          layerConstraints: [MapLayerName.Special],
          options: <PickupTool />,
        },
      }) satisfies Partial<Record<Mode, ToolDescriptor>>,
    [],
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
      tips.push("Select a tool above to start editing the map.");
    }
    return tips;
  }, [tool]);

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

            <PositionsFieldset />
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
                ref={containerRef}
                id={constants.mapEditorContainerId}
                style={{
                  width: "100%",
                  height: "100%",
                  overflow: "hidden",
                }}
              ></div>
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
                        Objects
                        {objectsBadge}
                      </Group>
                    </Tabs.Tab>
                    <Tabs.Tab value="animations">
                      <Group gap="xs">
                        Animations
                        {animationsBadge}
                      </Group>
                    </Tabs.Tab>
                    <Tabs.Tab value="npcs">
                      <Group gap="xs">
                        NPCs
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
          <Stack h="100%" style={{ overflow: "hidden" }}>
            <ToolPalette
              tools={toolPalette}
              activeTool={selectedToolName}
              onToolActivated={onToolActivated}
              onToolDeactivated={onToolDeactivated}
            />

            <Tip tips={tips} />
            <ScrollArea type="never" style={{ flex: 1 }}>
              <Stack p={0} pb={100}>
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
