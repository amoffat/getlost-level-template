import { Flex, Stack, Tabs, Text } from "@mantine/core";
import { Application } from "pixi.js";
import { useEffect, useRef, useState } from "react";
import { init as initMain } from "../editor/map";

import "@mantine/core/styles.css";
import "@mantine/dropzone/styles.css";

export default function MapEditorTab() {
  const mainRef = useRef<HTMLDivElement>(null);
  const [app, setApp] = useState<Application>();

  useEffect(() => {
    // const mat = cv.imread("");
    // cv.imshow("tileset-canvas", mat);
  }, []);

  useEffect(() => {
    const fn = async () => {
      const app = await initMain();
      app.resizeTo = mainRef.current!;
      setApp(app);
    };
    fn();
  }, []);

  useEffect(() => {
    if (!app) return;

    if (mainRef.current && mainRef.current.childNodes.length === 0) {
      mainRef.current.appendChild(app.canvas);
    }

    return () => {};
  }, [app]);

  return (
    <Flex>
      <Stack style={{ flex: 1 }}>
        <Tabs>
          <Tabs.List>
            <Tabs.Tab value="layers">Layers</Tabs.Tab>
            <Tabs.Tab value="tilesets">Tilesets</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="layers">
            <Text>hello</Text>
          </Tabs.Panel>
          <Tabs.Panel value="tilesets">
            <Text>hello</Text>
          </Tabs.Panel>
        </Tabs>
      </Stack>

      <div ref={mainRef} style={{ flex: 5, height: "100dvh" }} />

      <Stack style={{ flex: 1 }}></Stack>
    </Flex>
  );
}
