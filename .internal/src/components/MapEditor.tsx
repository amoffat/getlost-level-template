import {
  Fieldset,
  Flex,
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

  return (
    <Flex>
      <Stack miw={200} style={{ flex: 1 }}>
        <Tabs defaultValue={"objects"}>
          <Tabs.List>
            <Tabs.Tab value="objects">Objects</Tabs.Tab>
            <Tabs.Tab value="tilesets">Tilesets</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="objects">
            <Text>hello</Text>
          </Tabs.Panel>
          <Tabs.Panel value="tilesets">
            <Text>hello</Text>
          </Tabs.Panel>
        </Tabs>
      </Stack>

      <div ref={cRef} style={{ flex: 5, height: "100dvh" }} />

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
