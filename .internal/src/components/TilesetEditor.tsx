import {
  Fieldset,
  Flex,
  Group,
  ScrollArea,
  Stack,
  Switch,
  TagsInput,
  Text,
} from "@mantine/core";
import { Dropzone, FileWithPath, IMAGE_MIME_TYPE } from "@mantine/dropzone";
import { IconPhoto, IconUpload, IconX } from "@tabler/icons-react";
import { Application } from "pixi.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { init, loadTileset } from "../editor/tileset/init";
import { useAppDispatch, useAppSelector } from "../hooks/redux";
import { actions } from "../slices/tilesetEditor";
import GridsizeSlider from "./GridsizeSlider";

export default function TilesetEditorTab() {
  const cRef = useRef<HTMLDivElement>(null);
  const [app, setApp] = useState<Application>();
  const dispatch = useAppDispatch();
  const s = useAppSelector((state) => state.tilesetEditor);
  const gridSizes = useMemo(() => [8, 16, 32], []);

  useEffect(() => {
    const fn = async () => {
      const app = await init(cRef.current!);
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

  const changeGridSize = useCallback(
    async (size: number) => {
      dispatch(actions.setGridSize(size));
    },
    [dispatch]
  );

  return (
    <Flex style={{ height: "100dvh", minHeight: 0 }}>
      <Stack miw={200} style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
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

        <ScrollArea style={{ flex: 1, minHeight: 0 }}>
          <Text>Hello</Text>
        </ScrollArea>
      </Stack>
      <div ref={cRef} style={{ flex: 5, height: "100dvh" }} />
      <Stack miw={200} style={{ flex: 1 }}>
        <Fieldset legend="Grid settings">
          <Stack p={0}>
            <GridsizeSlider labels={gridSizes} onChange={changeGridSize} />
            <Switch
              mt="lg"
              label="Visible"
              checked={s.grid.visible}
              onChange={(event) => {
                dispatch(actions.setGridVisible(event.currentTarget.checked));
              }}
            />
          </Stack>
        </Fieldset>
        <Fieldset legend="Tags">
          <Stack p={0}>
            <TagsInput
              placeholder="Enter tag"
              splitChars={[",", " ", "|"]}
              limit={5}
              data={[]}
            />
          </Stack>
        </Fieldset>
      </Stack>
    </Flex>
  );
}
