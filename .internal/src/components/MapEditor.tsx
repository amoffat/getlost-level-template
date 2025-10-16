import * as constants from "@/constants";
import { LayerName } from "@/editor/collision/types/layer";
import { globals as g } from "@/globals";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { actions } from "@/slices/mapEditor";
import { RootState, store } from "@/store/store";
import { setToolThunk } from "@/thunks/map";
import { Mode } from "@/types/editor";
import { MapLayerName } from "@/types/layer";
import {
  Fieldset,
  Flex,
  Group,
  Portal,
  Radio,
  Stack,
  Switch,
  Tabs,
  Text,
  Tooltip,
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
  IconWand,
} from "@tabler/icons-react";
import { use, useCallback, useEffect, useMemo, useRef } from "react";
import HelpHoverCard from "./HelpHoverCard";
import ObjectPalette from "./ObjectPalette";
import ObjSelHover from "./ObjSelHover";
import MagicPaint from "./toolOptions/MagicPaint";
import Paint from "./toolOptions/Paint";
import ToolPalette, { ToolDescriptor } from "./ToolPalette";

export default function MapEditorTab({
  initPromise,
}: {
  initPromise: Promise<unknown>;
}) {
  const selectedToolName = useAppSelector(
    (state: RootState) => state.mapEditor.selectedTool
  );
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
    (id: string) => {
      dispatch(actions.setActiveLayer(Number.parseInt(id) as MapLayerName));
      dispatch(actions.setLockInactiveLayer(true));
    },
    [dispatch]
  );

  const onSelectObject = useCallback(
    (obj: any, e: React.MouseEvent) => {
      e.preventDefault();
      const state = store.getState();
      if (state.mapEditor.layers.active === LayerName.Meta) {
        dispatch(actions.setActiveLayer(MapLayerName.World));
      }
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
      paint: {
        name: "Paint area",
        icon: <IconPaint size={16} />,
        canActivate: true,
        disabled: place === null,
        options: <Paint />,
      },
      "magic-paint": {
        name: "Magic paint",
        icon: <IconWand size={16} />,
        canActivate: true,
        disabled: layers.active !== MapLayerName.Ground,
        options: <MagicPaint />,
      },
      "set-gateway": {
        name: "Set gateway",
        icon: <IconDoorExit size={16} />,
        switchToLayer: MapLayerName.Meta,
        canActivate: true,
      },
      "set-waypoint": {
        name: "Set waypoint",
        icon: <IconMapPin size={16} />,
        switchToLayer: MapLayerName.Meta,
        canActivate: true,
      },
      "add-collider": {
        name: "Add collider",
        icon: <IconCarCrash size={16} />,
        switchToLayer: MapLayerName.Meta,
        canActivate: true,
      },

      "set-sensor-zone": {
        name: "Sensor zone",
        icon: <IconInputSpark size={16} />,
        switchToLayer: MapLayerName.Meta,
        canActivate: true,
      },
      "set-sink-zone": {
        name: "Sink zone",
        icon: <IconRipple size={16} />,
        switchToLayer: MapLayerName.Meta,
        canActivate: true,
      },
      "set-sound-zone": {
        name: "Sound zone",
        icon: <IconEar size={16} />,
        switchToLayer: MapLayerName.Meta,
        canActivate: true,
      },
      "set-zoom-zone": {
        name: "Zoom zone",
        icon: <IconCameraSearch size={16} />,
        switchToLayer: MapLayerName.Meta,
        canActivate: true,
      },
      "add-light": {
        name: "Add light",
        icon: <IconBulb size={16} />,
        switchToLayer: MapLayerName.Meta,
        canActivate: false,
      },
    }),
    [layers.active, place]
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

  return (
    <>
      <Flex h="100dvh" style={{ flex: 1 }}>
        <Stack miw={200} h="100%" style={{ flex: 1, overflow: "hidden" }}>
          <Fieldset legend="Active layer">
            <Radio.Group
              onChange={changeActiveLayer}
              value={layers.active.toString()}
            >
              <Stack p={0}>
                <Tooltip
                  multiline
                  withArrow
                  position="left"
                  w={200}
                  openDelay={500}
                  label="The meta layer is reserved for special map features like sensors, sound zones, and lights"
                  refProp="rootRef"
                >
                  <Radio value={LayerName.Meta.toString()} label="Meta" />
                </Tooltip>
                <Tooltip
                  multiline
                  withArrow
                  position="left"
                  w={200}
                  openDelay={500}
                  label="World objects can appear in front of and behind a character, as the character moves around it"
                  refProp="rootRef"
                >
                  <Radio value={LayerName.World.toString()} label="World" />
                </Tooltip>
                <Tooltip
                  multiline
                  withArrow
                  position="left"
                  w={200}
                  openDelay={500}
                  label="Ground tiles always appear underneath a character"
                  refProp="rootRef"
                >
                  <Radio value={LayerName.Ground.toString()} label="Ground" />
                </Tooltip>
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
            </Radio.Group>
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
                />
              </Tabs.Panel>
            </Tabs>
          </Stack>
        </Flex>

        <Stack miw={200} style={{ flex: 1 }}>
          <ToolPalette
            tools={toolPalette}
            activeTool={selectedToolName}
            onToolActivated={onToolActivated}
            onToolDeactivated={onToolDeactivated}
          />

          {toolOptions && (
            <Fieldset legend={`${tool.name} options`} p="xs">
              {toolOptions}
            </Fieldset>
          )}
        </Stack>
      </Flex>

      <Portal>
        <ObjSelHover />
      </Portal>
    </>
  );
}
