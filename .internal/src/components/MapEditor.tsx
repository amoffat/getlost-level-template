import { Flex, Group, Stack, Tabs, Text } from "@mantine/core";
import { Dropzone, FileWithPath, IMAGE_MIME_TYPE } from "@mantine/dropzone";
import { IconPhoto, IconUpload, IconX } from "@tabler/icons-react";
import { Application } from "pixi.js";
import { useCallback, useEffect, useRef, useState } from "react";
import { initPixi } from "../pixi";

import "@mantine/core/styles.css";
import "@mantine/dropzone/styles.css";

export default function MapEditorTab() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [app, setApp] = useState<Application>();

  useEffect(() => {
    const mat = cv.imread("");
    cv.imshow("tileset-canvas", mat);
  }, []);

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

    if (containerRef.current && containerRef.current.childNodes.length === 0) {
      containerRef.current.appendChild(app.canvas);
    }

    return () => {};
  }, [app]);

  const uploadImage = useCallback(async (files: FileWithPath[]) => {
    if (!files.length) return;

    const form = new FormData();
    for (const f of files) form.append("file", f, f.name);

    await fetch("/api/image-upload", {
      method: "POST",
      body: form,
    });
  }, []);

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
            <Dropzone
              onDrop={uploadImage}
              maxSize={5 * 1024 ** 2}
              accept={IMAGE_MIME_TYPE}
              multiple={false}
            >
              <Group
                justify="center"
                gap="xs"
                mih={220}
                style={{ pointerEvents: "none" }}
              >
                <Dropzone.Accept>
                  <IconUpload
                    size={52}
                    color="var(--mantine-color-blue-6)"
                    stroke={1.5}
                  />
                </Dropzone.Accept>
                <Dropzone.Reject>
                  <IconX
                    size={52}
                    color="var(--mantine-color-red-6)"
                    stroke={1.5}
                  />
                </Dropzone.Reject>
                <Dropzone.Idle>
                  <IconPhoto
                    size={52}
                    color="var(--mantine-color-dimmed)"
                    stroke={1.5}
                  />
                </Dropzone.Idle>

                <div>
                  <Text size="xl" inline>
                    Drag a tileset here or click to select file
                  </Text>
                  <Text size="sm" c="dimmed" inline mt={7}>
                    The file should not exceed 5mb
                  </Text>
                </div>
              </Group>
            </Dropzone>
          </Tabs.Panel>
        </Tabs>
      </Stack>

      <Tabs style={{ flex: 5 }} defaultValue={"tileset"}>
        <Tabs.List>
          <Tabs.Tab value="map">Map</Tabs.Tab>
          <Tabs.Tab value="tileset">Tileset</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="map">
          <div ref={containerRef} style={{ height: "100dvh" }} />
        </Tabs.Panel>
        <Tabs.Panel value="tileset">
          <canvas id="tileset-canvas"></canvas>
        </Tabs.Panel>
      </Tabs>
      <Stack style={{ flex: 1 }}></Stack>
    </Flex>
  );
}
