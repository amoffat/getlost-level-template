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
  UnstyledButton,
} from "@mantine/core";
import { Dropzone, FileWithPath, IMAGE_MIME_TYPE } from "@mantine/dropzone";
import { IconUpload, IconX } from "@tabler/icons-react";
import { Application } from "pixi.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { init } from "../editor/tileset/init";
import { useAppDispatch, useAppSelector } from "../hooks/redux";
import { actions as mapActions } from "../slices/mapEditor";
import { actions, selectors } from "../slices/tilesetEditor";
import { selectTilesetThunk } from "../thunks/tileset";
import { TileGroup } from "../types/tilegroup";
import { Tileset } from "../types/tileset";
import { genTilesetId } from "../utils/tileset";
import GridsizeSlider from "./GridsizeSlider";
import HelpHoverCard from "./HelpHoverCard";
import ObjectPalette from "./ObjectPalette";

export default function TilesetEditorTab() {
  const cRef = useRef<HTMLDivElement>(null);
  const [app, setApp] = useState<Application>();
  const dispatch = useAppDispatch();
  const s = useAppSelector((state) => state.tilesetEditor);
  const gridSizes = useMemo(() => [8, 16, 32], []);

  useEffect(() => {
    (async () => {
      const app = await init(cRef.current!);
      setApp(app);
    })();
  }, []);

  useEffect(() => {
    if (!app) return;

    const c = cRef.current;
    if (c && c.childNodes.length === 0) {
      c.appendChild(app.canvas);
    }
  }, [app]);

  const uploadImage = useCallback(
    async (files: FileWithPath[]) => {
      if (!files.length) return;
      for (const file of files) {
        const objectUrl = URL.createObjectURL(file);
        const tsId = await genTilesetId(file);
        const ts: Tileset = {
          id: tsId,
          objectUrl,
          palette: {},
          paletteIds: [],
          saved: false,
        };
        await dispatch(selectTilesetThunk(ts));
      }
    },
    [dispatch]
  );

  const changeGridSize = useCallback(
    async (size: number) => {
      dispatch(actions.setGridSize(size));
    },
    [dispatch]
  );

  const loadedTilesets = useAppSelector(selectors.selectTilesets);
  const tilesetImages = loadedTilesets.map((ts) => (
    <UnstyledButton
      key={ts.id}
      p={0}
      onClick={() => dispatch(selectTilesetThunk(ts))}
      style={(theme) => ({
        overflow: "hidden",
        border:
          ts.id === s.activeTilesetId
            ? `2px solid ${theme.colors.blue[6]}`
            : "2px solid transparent",
        "&:hover": {
          borderColor: theme.colors.gray[4],
          cursor: "pointer",
        },
      })}
    >
      <Image key={ts.id} src={ts.objectUrl} />
    </UnstyledButton>
  ));

  const selectObject = (obj: TileGroup) => {
    dispatch(mapActions.setPlace(obj));
  };

  return (
    <Flex h="100dvh" style={{ flex: 1 }}>
      {/* Fullscreen dropzone overlay (only visible while dragging files) */}
      <Dropzone.FullScreen
        onDrop={uploadImage}
        maxSize={5 * 1024 ** 2}
        accept={IMAGE_MIME_TYPE}
        multiple
      >
        <Group
          justify="center"
          gap="xl"
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
            <IconX size={52} color="var(--mantine-color-red-6)" stroke={1.5} />
          </Dropzone.Reject>
          <div>
            <Text size="xl" inline>
              Drag images here or click to select files
            </Text>
            <Text size="sm" c="dimmed" inline mt={7}>
              Attach as many files as you like, each file should not exceed 5mb
            </Text>
          </div>
        </Group>
      </Dropzone.FullScreen>
      <Stack miw={200} h="100%" style={{ flex: 1, overflow: "hidden" }}>
        <ScrollArea type="hover" offsetScrollbars="y" style={{ flex: 1 }}>
          <Stack pb={50}>{tilesetImages}</Stack>
        </ScrollArea>
      </Stack>
      <Flex direction="column" style={{ flex: 5, minHeight: 0, minWidth: 0 }}>
        <div
          ref={cRef}
          style={{ flex: 3, minHeight: 0, overflow: "hidden" }}
        ></div>

        <Stack style={{ flex: 2, minHeight: 0 }} p={0}>
          <Tabs defaultValue={"palette"} className="flex-overflow">
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
                height: "100%",
                display: "flex",
              }}
            >
              <ObjectPalette
                onSelectObject={selectObject}
                tileset={
                  s.activeTilesetId ? s.tilesets[s.activeTilesetId] : null
                }
              />
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
