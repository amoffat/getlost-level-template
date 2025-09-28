import { Vector } from "@/vec";
import {
  Fieldset,
  Flex,
  Group,
  Menu,
  Portal,
  ScrollArea,
  Stack,
  Switch,
  Tabs,
  TagsInput,
  Text,
} from "@mantine/core";
import {
  IconBlocks,
  IconStack2,
  IconTag,
  IconTrash,
} from "@tabler/icons-react";
import { Application } from "pixi.js";
import { useCallback, useEffect, useRef, useState } from "react";
import { init } from "../editor/tileset/init";
import { useAppDispatch, useAppSelector } from "../hooks/redux";
import { actions, selectors } from "../slices/tilesetEditor";
import { selectTilesetThunk } from "../thunks/tileset";
import { TileGroup } from "../types/tilegroup";
import GridSizeInput from "./GridSizeInput";
import HelpHoverCard from "./HelpHoverCard";
import ObjectMenu from "./ObjectMenu";
import ObjectPalette from "./ObjectPalette";
import TilesetButton from "./TilesetButton";

export default function TilesetEditorTab() {
  const cRef = useRef<HTMLDivElement>(null);
  const [app, setApp] = useState<Application>();
  const dispatch = useAppDispatch();
  const s = useAppSelector((state) => state.tilesetEditor);
  const [objMenuPos, setObjMenuPos] = useState<Vector | null>(null);

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

  const changeGridSize = useCallback(
    async (size: number | string) => {
      if (typeof size === "string") return;
      dispatch(actions.setGridSize(size));
    },
    [dispatch]
  );

  const loadedTilesets = useAppSelector(selectors.selectTilesets);
  const tilesetImages = loadedTilesets.map((ts) => (
    <TilesetButton
      key={ts.id}
      onClick={() => dispatch(selectTilesetThunk(ts))}
      imgSrc={ts.objectUrl}
      isActive={ts.id === s.activeTilesetId}
    />
  ));

  const selectObject = (obj: TileGroup, e: React.MouseEvent) => {
    e.stopPropagation();
    const el = e.target as HTMLElement;
    const rect = el.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 4;
    setObjMenuPos({ x, y });
  };

  const deselectObject = () => {
    setObjMenuPos(null);
  };

  useEffect(() => {
    const escapeHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        deselectObject();
      }
    };
    window.addEventListener("keydown", escapeHandler);
    window.addEventListener("click", deselectObject);
    return () => {
      window.removeEventListener("keydown", escapeHandler);
      window.removeEventListener("click", deselectObject);
    };
  }, []);

  return (
    <>
      <Flex h="100dvh" style={{ flex: 1 }}>
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
                        tileset. By default, all single-tile objects are added.
                        As you create groupings, the single-tile objects will be
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
                  onDeselectObject={deselectObject}
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
              <GridSizeInput
                defaultValue={s.grid.size}
                onChange={changeGridSize}
              />
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
      <Portal>
        <ObjectMenu pos={objMenuPos} opened={objMenuPos !== null}>
          <Menu.Label>Tile Group Actions</Menu.Label>

          <Menu.Item leftSection={<IconStack2 size={14} />}>
            Set z-index
          </Menu.Item>
          <Menu.Item leftSection={<IconBlocks size={14} />}>
            Set colliders
          </Menu.Item>
          <Menu.Item leftSection={<IconTag size={14} />}>Set tags</Menu.Item>

          <Menu.Divider />

          <Menu.Label>Danger zone</Menu.Label>
          <Menu.Item color="red" leftSection={<IconTrash size={14} />}>
            Delete
          </Menu.Item>
        </ObjectMenu>
      </Portal>
    </>
  );
}
