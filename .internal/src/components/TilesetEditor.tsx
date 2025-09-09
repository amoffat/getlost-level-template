import { Fieldset, Flex, Group, Stack, Switch, Text } from "@mantine/core";
import { Dropzone, FileWithPath, IMAGE_MIME_TYPE } from "@mantine/dropzone";
import { IconPhoto, IconUpload, IconX } from "@tabler/icons-react";
import { Application } from "pixi.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { init, loadTileset } from "../editor/tileset";
import GridsizeSlider from "./GridsizeSlider";

export default function TilesetEditorTab() {
  const cRef = useRef<HTMLDivElement>(null);
  const [app, setApp] = useState<Application>();

  const gridSizes = useMemo(() => [4, 8, 16, 32], []);

  useEffect(() => {
    const fn = async () => {
      const app = await init();
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
  }, [app]);

  const uploadImage = useCallback(
    // const form = new FormData();
    // for (const f of files) form.append("file", f, f.name);

    // await fetch("/api/image-upload", {
    //   method: "POST",
    //   body: form,
    // });

    async (files: FileWithPath[]) => {
      if (!files.length) return;
      const file = files[0];
      await loadTileset(file);
    },
    []
  );

  const changeGridSize = useCallback(async (size: number) => {
    // TODO: apply grid size to tileset editor once API is available
    // e.g., await setGridSize(size)
    void size; // avoid unused var until integration
  }, []);

  return (
    <Flex>
      <Stack miw={200} style={{ flex: 1 }}>
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
      </Stack>
      <div ref={cRef} style={{ flex: 5, height: "100dvh" }} />
      <Stack miw={200} style={{ flex: 1 }}>
        <Fieldset legend="Grid">
          <GridsizeSlider labels={gridSizes} onChangeEnd={changeGridSize} />
          <Switch
            mt="xl"
            label="Visible"
            checked={true}
            onChange={(event) => {
              // Handle switch change
            }}
          />
        </Fieldset>
      </Stack>
    </Flex>
  );
}
