import { mergeFrames } from "@/utils/image";
import {
  Fieldset,
  Flex,
  Group,
  ScrollArea,
  Stack,
  Switch,
  Tabs,
  TagsInput,
  Text,
} from "@mantine/core";
import { FileWithPath } from "@mantine/dropzone";
import { Application } from "pixi.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { init } from "../editor/npc/init";
import { useAppDispatch, useAppSelector } from "../hooks/redux";
import { actions, selectors } from "../slices/npcEditor";
import { selectTilesetThunk } from "../thunks/npc";
import { TileGroup } from "../types/tilegroup";
import GridSizeInput from "./GridSizeInput";
import HelpHoverCard from "./HelpHoverCard";
import TilesetButton from "./TilesetButton";

export default function NpcEditorTab() {
  const cRef = useRef<HTMLDivElement>(null);
  const [app, setApp] = useState<Application>();
  const dispatch = useAppDispatch();
  const s = useAppSelector((state) => state.npcEditor);
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

  const uploadNPCFrames = useCallback(
    async (files: FileWithPath[]) => {
      if (!files.length) return;
      if (files.length > 1) {
        const merged = await mergeFrames(files);
      }
    },
    [dispatch]
  );

  const changeGridSize = useCallback(
    async (size: number | string) => {
      if (typeof size === "string") return;
      dispatch(actions.setGridSize(size));
    },
    [dispatch]
  );

  const loadedTilesets = useAppSelector(selectors.selectNPCs);
  const tilesetImages = loadedTilesets.map((ts) => (
    <TilesetButton
      key={ts.id}
      onClick={() => dispatch(selectTilesetThunk(ts))}
      imgSrc={ts.objectUrl}
      isActive={ts.id === s.activeTilesetId}
    />
  ));

  const selectObject = (obj: TileGroup) => {
    // dispatch(mapActions.setPlace(obj));
  };

  const onAssetTypeSubmit = useCallback((assetType: string) => {
    console.log(assetType);
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
                    NPCs
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
                <Text></Text>
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
    </>
  );
}
