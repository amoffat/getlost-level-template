import * as constants from "@/constants";
import { globals as g } from "@/globals";
import { setToolThunk } from "@/thunks/map";
import { Mode } from "@/types/editor";
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
  IconCircle,
  IconEar,
  IconInputSpark,
  IconMapPin,
  IconPaint,
  IconRectangle,
  IconRipple,
  IconWand,
} from "@tabler/icons-react";
import { use, useCallback, useEffect, useMemo, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../hooks/redux";
import { actions } from "../slices/mapEditor";
import { RootState } from "../store/store";
import { LayerName } from "../types/layer";
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
  const s = useAppSelector((state: RootState) => state.mapEditor);
  const dispatch = useAppDispatch();
  const containerRef = useRef<HTMLDivElement>(null);

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
      dispatch(actions.setActiveLayer(id as LayerName));
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

  const toolPalette: ToolDescriptor<Mode>[] = useMemo(
    () => [
      {
        slug: "paint",
        name: "Paint area",
        icon: <IconPaint size={16} />,
        canActivate: true,
      },
      {
        slug: "magic-paint",
        name: "Magic paint",
        icon: <IconWand size={16} />,
        canActivate: true,
      },
      {
        slug: "set-waypoint",
        name: "Set waypoint",
        icon: <IconMapPin size={16} />,
        canActivate: true,
      },
      {
        slug: "circle-collision",
        name: "Circle collider",
        icon: <IconCircle size={16} />,
        canActivate: true,
      },
      {
        slug: "rect-collision",
        name: "Rectangle collider",
        icon: <IconRectangle size={16} />,
        canActivate: true,
      },
      // {
      //   slug: "set-bounds",
      //   name: "Set map bounds",
      //   icon: <IconCrop size={16} />,
      //   canActivate: true,
      // },
      {
        slug: "set-sensor-zone",
        name: "Sensor zone",
        icon: <IconInputSpark size={16} />,
        canActivate: true,
      },
      {
        slug: "set-sink-zone",
        name: "Sink zone",
        icon: <IconRipple size={16} />,
        canActivate: true,
      },
      {
        slug: "set-sound-zone",
        name: "Sound zone",
        icon: <IconEar size={16} />,
        canActivate: true,
      },
      {
        slug: "set-zoom-zone",
        name: "Zoom zone",
        icon: <IconCameraSearch size={16} />,
        canActivate: true,
      },
      {
        slug: "add-light",
        name: "Add light",
        icon: <IconBulb size={16} />,
        canActivate: false,
      },
    ],
    []
  );
  const toolName = useMemo(() => {
    const tool = toolPalette.find((t) => t.slug === s.selectedTool);
    return tool ? tool.name : null;
  }, [s.selectedTool, toolPalette]);

  const allToolOptions: Partial<Record<Mode, React.ReactNode>> = useMemo(
    () => ({
      paint: <Paint />,
      "magic-paint": <MagicPaint />,
    }),
    []
  );
  const toolOptions = s.selectedTool ? allToolOptions[s.selectedTool] : null;

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
            <Radio.Group onChange={changeActiveLayer} value={s.layers.active}>
              <Stack p={0}>
                <Tooltip
                  multiline
                  withArrow
                  position="left"
                  w={200}
                  openDelay={500}
                  label="World tiles can appear in front of and behind characters"
                  refProp="rootRef"
                >
                  <Radio value="world" label="World" />
                </Tooltip>
                <Tooltip
                  multiline
                  withArrow
                  position="left"
                  w={200}
                  openDelay={500}
                  label="Ground tiles always appear underneath characters"
                  refProp="rootRef"
                >
                  <Radio value="ground" label="Ground" />
                </Tooltip>
                <Switch
                  label="Lock inactive layer"
                  checked={s.layers.lockInactive}
                  onChange={(event) => {
                    dispatch(
                      actions.setLockInactiveLayer(event.currentTarget.checked)
                    );
                  }}
                />
                <Switch
                  label="Dim inactive layer"
                  checked={s.layers.dimInactive}
                  onChange={(event) => {
                    dispatch(
                      actions.setDimInactiveLayer(event.currentTarget.checked)
                    );
                  }}
                />
              </Stack>
            </Radio.Group>
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
            activeTool={s.selectedTool}
            onToolActivated={onToolActivated}
            onToolDeactivated={onToolDeactivated}
          />

          {toolOptions && (
            <Fieldset legend={`${toolName} options`}>{toolOptions}</Fieldset>
          )}
        </Stack>
      </Flex>

      <Portal>
        <ObjSelHover />
      </Portal>
    </>
  );
}
