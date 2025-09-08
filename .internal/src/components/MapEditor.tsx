import { Flex, Stack, Text } from "@mantine/core";
import { Application } from "pixi.js";
import { useEffect, useRef, useState } from "react";
import { initPixi } from "../pixi";

export default function MapEditorTab() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [app, setApp] = useState<Application>();

  useEffect(() => {
    const c = containerRef.current!;
    c.innerHTML = "";

    const fn = async () => {
      const app = await initPixi();
      app.resizeTo = c;
      setApp(app);
    };
    fn();
  }, []);

  useEffect(() => {
    if (!app) return;

    if (containerRef.current) {
      containerRef.current.appendChild(app.canvas);
    }

    return () => {
      app.destroy(true, { children: true });
    };
  }, [app]);

  return (
    <Flex align="stretch" style={{ height: "100dvh" }}>
      <Stack p="xs" style={{ flex: 1 }}>
        <Text>hello</Text>
      </Stack>
      <div ref={containerRef} style={{ flex: 5 }} />
      <Stack p="xs" style={{ flex: 1 }}>
        <Text>hello</Text>
      </Stack>
    </Flex>
  );
}
