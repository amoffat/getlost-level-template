import * as constants from "@/constants";
import { globals as g } from "@/globals";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { actions, selectors } from "@/slices/mapEditor";
import { RootState } from "@/store/store";
import { setActiveLayerThunk, setToolThunk } from "@/thunks/map";
import { Mode } from "@/types/editor";
import { MapLayerName } from "@/types/layer";
import {
  Fieldset,
  Flex,
  Group,
  Portal,
  Stack,
  Switch,
  Tabs,
  Text,
} from "@mantine/core";
import {
  IconBulb,
  IconCameraSearch,
  IconCarCrash,
  IconDoorExit,
  IconEar,
  IconInputSpark,
  IconMapPin,
  IconPaint,
  IconRipple,
  IconSelectAll,
  IconWand,
} from "@tabler/icons-react";
import { use, useCallback, useEffect, useMemo, useRef } from "react";
import HelpHoverCard from "./HelpHoverCard";
import LayerList, { Layer } from "./LayerList";
import ObjectPalette from "./ObjectPalette";
import ObjSelHover from "./ObjSelHover";
import Tip from "./Tip";
import AddCollider from "./toolOptions/AddCollider";
import MagicPaint from "./toolOptions/MagicPaint";
import Paint from "./toolOptions/Paint";
import SelectTool from "./toolOptions/SelectTool";
import ToolPalette, { ToolDescriptor } from "./ToolPalette";

export default function MapEditorTab({
  initPromise,
}: {
  initPromise: Promise<unknown>;
}) {
  const selectedToolName = useAppSelector(
    (state: RootState) => state.mapEditor.selectedTool
  );
  const paletteSelection = useAppSelector(selectors.paletteSelectedTgIds);
  const layers = useAppSelector((state: RootState) => state.mapEditor.layers);
  const gridPos = useAppSelector(
    (state: RootState) => state.mapEditor.grid.curPos
  );
  const place = useAppSelector((state: RootState) => state.mapEditor.place.obj);
  const dispatch = useAppDispatch();
  const containerRef = useRef<HTMLDivElement>(null);

  // This waits for our tileset and map to load from the shell.
  use(initPromise);

  useEffect(() => {
    const container = containerRef.current!;
    const canvas = g.mapEditorApp!.canvas;
    g.mapEditorApp!.resizeTo = container;
    if (!container.contains(canvas)) {
      container.appendChild(canvas);
    }
  }, []);

  const changeActiveLayer = useCallback(
    (id: number) => {
      dispatch(setActiveLayerThunk({ layer: id as MapLayerName }));
      dispatch(actions.setLockInactiveLayer(true));
    },
    [dispatch]
  );

  const onSelectObject = useCallback(
    (obj: any, e: React.MouseEvent) => {
      e.preventDefault();
      dispatch(actions.setPlace(obj));
      dispatch(setToolThunk("paint"));
    },
    [dispatch]
  );

  const onDeselectObject = useCallback(() => {
    dispatch(actions.setPlace(null));
    dispatch(setToolThunk(null));
  }, [dispatch]);

  const toolPalette: Partial<Record<Mode, ToolDescriptor>> = useMemo(
    () => ({
      select: {
        name: "Select/move",
        icon: <IconSelectAll size={16} />,
        options: <SelectTool />,
      },
      paint: {
        name: "Paint area",
        icon: <IconPaint size={16} />,
        enabled: place !== null,
        options: <Paint />,
      },
      "magic-paint": {
        name: "Autotiler",
        icon: <IconWand size={16} />,
        switchToLayer: MapLayerName.Ground,
        options: <MagicPaint />,
      },
      "set-gateway": {
        name: "Set gateway",
        icon: <IconDoorExit size={16} />,
        switchToLayer: MapLayerName.Places,
      },
      "set-waypoint": {
        name: "Set waypoint",
        icon: <IconMapPin size={16} />,
        switchToLayer: MapLayerName.Places,
      },
      "add-collider": {
        name: "Add collider",
        icon: <IconCarCrash size={16} />,
        switchToLayer: MapLayerName.Colliders,
        options: <AddCollider />,
      },

      "set-sensor-zone": {
        name: "Sensor zone",
        icon: <IconInputSpark size={16} />,
        switchToLayer: MapLayerName.Colliders,
      },
      "set-sink-zone": {
        name: "Sink zone",
        icon: <IconRipple size={16} />,
        switchToLayer: MapLayerName.Colliders,
      },
      "set-sound-zone": {
        name: "Sound zone",
        icon: <IconEar size={16} />,
        switchToLayer: MapLayerName.Colliders,
      },
      "set-zoom-zone": {
        name: "Zoom zone",
        icon: <IconCameraSearch size={16} />,
        switchToLayer: MapLayerName.Colliders,
      },
      "add-light": {
        name: "Add light",
        icon: <IconBulb size={16} />,
        switchToLayer: MapLayerName.Colliders,
      },
    }),
    [place]
  );

  const tool = selectedToolName && toolPalette[selectedToolName];
  const toolOptions = tool?.options;

  const onToolActivated = useCallback(
    (slug: string) => {
      dispatch(setToolThunk(slug as Mode));
    },
    [dispatch]
  );

  const onToolDeactivated = useCallback(() => {
    dispatch(setToolThunk(null));
  }, [dispatch]);

  const layerList: Layer[] = useMemo(() => {
    return [
      {
        id: MapLayerName.Colliders,
        description: "Objects that stop character movement",
      },
      {
        id: MapLayerName.World,
        description:
          "Objects that can appear in front of and behind a character",
      },
      {
        id: MapLayerName.Ground,
        description: "Ground objects are always rendered beneath the character",
      },
      {
        id: MapLayerName.Places,
        description: "Special locations like gateways and waypoints",
      },
    ];
  }, []);

  const tips: string[] = useMemo(() => {
    const tips: string[] = [];

    if (!tool) {
      tips.push("Select a tool above to start editing the map.");
    }
    return tips;
  }, [tool]);

  return (
    <>
      <Flex h="100dvh" style={{ flex: 1 }}>
        <Stack miw={300} h="100%" style={{ flex: 1, overflow: "hidden" }}>
          <Fieldset legend="Layers" p="xs">
            <Stack p={0}>
              <LayerList
                layers={layerList}
                selected={layers.active}
                onChange={changeActiveLayer}
              />
              <Switch
                label="Lock inactive layer"
                checked={layers.lockInactive}
                onChange={(event) => {
                  dispatch(
                    actions.setLockInactiveLayer(event.currentTarget.checked)
                  );
                }}
              />
              <Switch
                label="Dim inactive layer"
                checked={layers.dimInactive}
                onChange={(event) => {
                  dispatch(
                    actions.setDimInactiveLayer(event.currentTarget.checked)
                  );
                }}
              />
            </Stack>
          </Fieldset>

          <Fieldset legend="Grid">
            <Stack p={0}>
              {gridPos && (
                <Text size="sm" variant="text">
                  Position: {gridPos.x}, {gridPos.y}
                </Text>
              )}
            </Stack>
          </Fieldset>
        </Stack>

        <Flex
          direction="column"
          style={{ flex: 5, minHeight: 0, minWidth: 0, position: "relative" }}
        >
          <div
            ref={containerRef}
            id={constants.mapEditorContainerId}
            style={{
              flex: 3,
              minHeight: 0,
              overflow: "hidden",
            }}
          ></div>

          <Stack style={{ flex: 2, minHeight: 0 }} h="100%" p={0}>
            <Tabs defaultValue={"palette"} className="flex-overflow">
              <Tabs.List>
                <Tabs.Tab value="palette">
                  <Group gap="xs">
                    Object Palette
                    <HelpHoverCard>
                      <Text size="sm">
                        Place an object from the palette onto the map.
                      </Text>
                    </HelpHoverCard>
                  </Group>
                </Tabs.Tab>
                <Tabs.Tab value="npcs">
                  <Group gap="xs">
                    NPCs
                    <HelpHoverCard>
                      <Text size="sm">
                        Place an NPC from the palette onto the map.
                      </Text>
                    </HelpHoverCard>
                  </Group>
                </Tabs.Tab>
              </Tabs.List>
              <Tabs.Panel
                value="palette"
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
                  selectedObjects={paletteSelection}
                />
              </Tabs.Panel>
            </Tabs>
          </Stack>
        </Flex>

        <Stack miw={300} style={{ flex: 1 }}>
          <ToolPalette
            tools={toolPalette}
            activeTool={selectedToolName}
            onToolActivated={onToolActivated}
            onToolDeactivated={onToolDeactivated}
          />

          <Tip tips={tips} />

          {toolOptions}
        </Stack>
      </Flex>

      <Portal>
        <ObjSelHover />
      </Portal>
    </>
  );
}
