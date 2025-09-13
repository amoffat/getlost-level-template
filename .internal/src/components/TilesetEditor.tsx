import {
  Fieldset,
  Flex,
  Group,
  Image,
  ScrollArea,
  Stack,
  Switch,
  Tabs,
  TagsInput,
  Text,
} from "@mantine/core";
import { Dropzone, FileWithPath, IMAGE_MIME_TYPE } from "@mantine/dropzone";
import { IconPhoto, IconUpload, IconX } from "@tabler/icons-react";
import { Application } from "pixi.js";
import { JSX, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { init, loadTileset } from "../editor/tileset/init";
import { useAppDispatch, useAppSelector } from "../hooks/redux";
import { actions as mapActions } from "../slices/mapEditor";
import { actions, selectors } from "../slices/tilesetEditor";
import { TileGroup } from "../types/tilegroup";
import GridsizeSlider from "./GridsizeSlider";
import HelpHoverCard from "./HelpHoverCard";
import ObjectPalette from "./ObjectPalette";
import TilesetGroup from "./TilesetGroup";

export default function TilesetEditorTab() {
  const cRef = useRef<HTMLDivElement>(null);
  const [app, setApp] = useState<Application>();
  const dispatch = useAppDispatch();
  const s = useAppSelector((state) => state.tilesetEditor);
  const ms = useAppSelector((state) => state.mapEditor);
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
      for (const file of files) {
        await loadTileset(file);
      }
    },
    []
  );

  const changeGridSize = useCallback(
    async (size: number) => {
      dispatch(actions.setGridSize(size));
    },
    [dispatch]
  );

  const loadedTilesets = useAppSelector(selectors.selectTilesets);
  const tilesetImages = loadedTilesets.map((ts) => (
    <Image key={ts.id} src={ts.objectUrl} />
  ));

  const objects: JSX.Element[] = useMemo(() => {
    const objs: JSX.Element[] = [];
    const num = ms.paletteIds.length;
    for (let i = num - 1; i >= 0; i--) {
      const objId = ms.paletteIds[i];
      const group = ms.palette[objId];
      objs.push(
        <TilesetGroup
          scale={1}
          key={i}
          id={group.id}
          src={group.objectUrl}
          coords={group.pos}
        />
      );
    }

    return objs;
  }, [ms.paletteIds, ms.palette]);

  const selectObject = (obj: TileGroup) => {
    dispatch(mapActions.setPlace(obj));
  };

  return (
    <Flex h="100dvh" style={{ flex: 1 }}>
      <Stack miw={200} h="100%" style={{ flex: 1, overflow: "hidden" }}>
        <Dropzone
          onDrop={uploadImage}
          maxSize={5 * 1024 ** 2}
          accept={IMAGE_MIME_TYPE}
          multiple={true}
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

        <ScrollArea type="hover" offsetScrollbars="y" style={{ flex: 1 }}>
          <Stack pb={50}>{tilesetImages}</Stack>
        </ScrollArea>
      </Stack>
      <Flex direction="column" style={{ flex: 5, minHeight: 0 }}>
        <div ref={cRef} style={{ flex: 3 }}></div>

        <Stack style={{ flex: 2, minHeight: 0 }} p={0}>
          <Tabs
            defaultValue={"palette"}
            style={{
              height: "100%",
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Tabs.List>
              <Tabs.Tab value="palette">
                <Group gap="xs">
                  Objects
                  <HelpHoverCard>
                    <Text size="sm">
                      These are objects that have been extracted from the
                      tileset. By default, all single-tile objects are added. As
                      you create groupings, the single-tile objects will be
                      replaced by the groups.
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
                overflow: "hidden",
                display: "flex",
              }}
            >
              <ObjectPalette onSelectObject={selectObject} />
            </Tabs.Panel>
          </Tabs>
        </Stack>
      </Flex>
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
