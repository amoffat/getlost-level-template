import {
  Fieldset,
  Flex,
  Group,
  Radio,
  Stack,
  Switch,
  Tabs,
  Text,
  Tooltip,
} from "@mantine/core";
import { Application } from "pixi.js";
import { useCallback, useEffect, useRef, useState } from "react";
import { init as initMain } from "../editor/map/init";
import { useAppDispatch, useAppSelector } from "../hooks/redux";
import { actions } from "../slices/mapEditor";

import "@mantine/core/styles.css";
import "@mantine/dropzone/styles.css";
import { RootState } from "../store";
import { ActiveLayer } from "../types/layer";
import { TileGroup } from "../types/tilegroup";
import HelpHoverCard from "./HelpHoverCard";
import ObjectPalette from "./ObjectPalette";

export default function MapEditorTab() {
  const cRef = useRef<HTMLDivElement>(null);
  const [app, setApp] = useState<Application>();
  const s = useAppSelector((state: RootState) => state.mapEditor);
  const dispatch = useAppDispatch();

  useEffect(() => {
    // const mat = cv.imread("");
    // cv.imshow("tileset-canvas", mat);
  }, []);

  useEffect(() => {
    const fn = async () => {
      const app = await initMain(cRef.current!);
      app.resizeTo = cRef.current!;
      setApp(app);
    };
    fn();
  }, []);

  useEffect(() => {
    if (!app) return;

    const c = cRef.current;
    if (c && c.childNodes.length === 0) {
      c.appendChild(app.canvas);
    }

    return () => {};
  }, [app]);

  const changeActiveLayer = useCallback(
    (id: string) => {
      dispatch(actions.setActiveLayer(id as ActiveLayer));
      dispatch(actions.setDimInactiveLayer(true));
    },
    [dispatch]
  );

  const selectObject = (obj: TileGroup) => {
    dispatch(actions.setPlace(obj));
  };

  return (
    <Flex h="100dvh" style={{ flex: 1 }}>
      <Stack miw={200} h="100%" style={{ flex: 1, overflow: "hidden" }}>
        <Tabs defaultValue={"tilesets"}>
          <Tabs.List>
            <Tabs.Tab value="tilesets">NPCs</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="tilesets">
            <Text>hello</Text>
          </Tabs.Panel>
        </Tabs>
      </Stack>

      <Flex direction="column" style={{ flex: 5, minHeight: 0, minWidth: 0 }}>
        <div ref={cRef} style={{ flex: 3, minHeight: 0, overflow: "hidden" }} />

        <Stack style={{ flex: 2, minHeight: 0 }} h="100%" p={0}>
          <Tabs defaultValue={"palette"} className="flex-overflow">
            <Tabs.List>
              <Tabs.Tab value="palette">
                <Group gap="xs">
                  Palette
                  <HelpHoverCard>
                    <Text size="sm">
                      Place an object from the palette onto the map.
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
              <ObjectPalette onSelectObject={selectObject} />
            </Tabs.Panel>
          </Tabs>
        </Stack>
      </Flex>

      <Stack miw={200} style={{ flex: 1 }}>
        <Fieldset legend="Active tile layer">
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
    </Flex>
  );
}
