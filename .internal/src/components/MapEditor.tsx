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
import { useCallback, useEffect, useMemo } from "react";
import { init } from "../editor/map/init";
import { useAppDispatch, useAppSelector } from "../hooks/redux";
import { actions } from "../slices/mapEditor";

import { globals as g } from "@/globals";
import { Mode } from "@/types/editor";
import {
  IconBulb,
  IconCameraSearch,
  IconCircle,
  IconEar,
  IconMapPin,
  IconPaint,
  IconRectangle,
  IconRipple,
  IconWand,
} from "@tabler/icons-react";
import { RootState } from "../store/store";
import { LayerName } from "../types/layer";
import HelpHoverCard from "./HelpHoverCard";
import ObjectPalette from "./ObjectPalette";
import ObjSelHover from "./ObjSelHover";
import ToolPalette, { ToolDescriptor } from "./ToolPalette";

export default function MapEditorTab() {
  const s = useAppSelector((state: RootState) => state.mapEditor);
  const dispatch = useAppDispatch();

  const getContainer = useCallback(() => {
    return document.getElementById("map-editor-container")!;
  }, []);

  // Initialize pixi.js app once
  useEffect(() => {
    (async () => {
      const container = getContainer();
      if (g.mapEditorApp) {
        g.mapEditorApp.resizeTo = container;
        return;
      }
      const app = await init(getContainer);
      app.resizeTo = container;
      g.mapEditorApp = app;
      container.appendChild(app.canvas);
    })();
  }, [getContainer]);

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
      dispatch(actions.setMode("place"));
    },
    [dispatch]
  );

  const onDeselectObject = useCallback(() => {
    dispatch(actions.setPlace(null));
    dispatch(actions.setMode("select"));
  }, [dispatch]);

  const toolPalette: ToolDescriptor<Mode>[] = useMemo(
    () => [
      {
        slug: "fill",
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
        slug: "set-water-zones",
        name: "Water zones",
        icon: <IconRipple size={16} />,
        canActivate: true,
      },
      {
        slug: "set-sound-zones",
        name: "Sound zones",
        icon: <IconEar size={16} />,
        canActivate: true,
      },
      {
        slug: "set-zoom-zones",
        name: "Zoom zones",
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

  let toolOptions = null;

  const onToolActivated = useCallback(
    (slug: string) => {
      dispatch(actions.setActiveTool(slug as Mode));
    },
    [dispatch]
  );

  return (
    <>
      <Flex h="100dvh" style={{ flex: 1 }}>
        <Stack miw={200} h="100%" style={{ flex: 1, overflow: "hidden" }}>
          <Tabs defaultValue={"tilesets"}>
            <Tabs.List>
              <Tabs.Tab value="tilesets">NPCs</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="tilesets">
              <Text></Text>
            </Tabs.Panel>
          </Tabs>
        </Stack>

        <Flex
          direction="column"
          style={{ flex: 5, minHeight: 0, minWidth: 0, position: "relative" }}
        >
          <div
            id="map-editor-container"
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
          <ToolPalette tools={toolPalette} onToolActivated={onToolActivated} />

          {toolOptions && (
            <Fieldset legend="Tool options">{toolOptions}</Fieldset>
          )}

          <Fieldset legend="Active layer">
            <Radio.Group onChange={changeActiveLayer} value={s.layers.active}>
              <Stack p={0}>
                <Tooltip
                  multiline
                  withArrow
                  position="left"
                  w={200}
                  openDelay={1000}
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
                  openDelay={1000}
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
              </Stack>
            </Radio.Group>
          </Fieldset>
        </Stack>
      </Flex>

      <Portal>
        <ObjSelHover />
      </Portal>
    </>
  );
}
