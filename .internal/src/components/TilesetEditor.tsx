import * as constants from "@/constants";
import { unpackActiveTileset } from "@/editor/tileset/loader";
import { globals as g } from "@/globals";
import { Mode } from "@/types/tileset";
import {
  Fieldset,
  Flex,
  Group,
  ScrollArea,
  Stack,
  Tabs,
  Text,
} from "@mantine/core";
import {
  IconCut,
  IconGrid4x4,
  IconReplace,
  IconTrash,
} from "@tabler/icons-react";
import { use, useCallback, useEffect, useMemo, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../hooks/redux";
import { actions, selectors } from "../slices/tilesetEditor";
import { selectTilesetThunk } from "../thunks/tileset";
import GridSizeInput from "./GridSizeInput";
import HelpHoverCard from "./HelpHoverCard";
import ObjectPalette from "./ObjectPalette";
import TilesetButton from "./TilesetButton";
import ToolPalette, { ToolDescriptor } from "./ToolPalette";

export default function TilesetEditorTab({
  initPromise,
}: {
  initPromise: Promise<unknown>;
}) {
  const dispatch = useAppDispatch();
  const s = useAppSelector((state) => state.tilesetEditor);
  const containerRef = useRef<HTMLDivElement>(null);

  use(initPromise);

  useEffect(() => {
    const container = containerRef.current!;
    const canvas = g.tilesetEditorApp!.canvas;
    g.tilesetEditorApp!.resizeTo = container;
    if (!container.contains(canvas)) {
      container.appendChild(canvas);
    }
  }, []);

  const changeGridSize = useCallback(
    async (size: number | string) => {
      if (typeof size === "string") return;
      dispatch(actions.setGridSize(size));
    },
    [dispatch]
  );

  const resliceTiles = useCallback(() => {
    if (!s.activeTilesetId) return;
    dispatch(actions.clearPalette(s.activeTilesetId));
    unpackActiveTileset();
  }, [dispatch, s.activeTilesetId]);

  const loadedTilesets = useAppSelector(selectors.selectTilesets);
  const tilesetImages = loadedTilesets.map((ts) => (
    <TilesetButton
      key={ts.id}
      ts={ts}
      onClick={() => dispatch(selectTilesetThunk(ts))}
      isActive={ts.id === s.activeTilesetId}
    />
  ));

  const toolPalette: Partial<Record<Mode, ToolDescriptor>> = useMemo(
    () => ({
      "replace-group": {
        name: "Replace group",
        icon: <IconReplace size={16} />,
        canActivate: true,
      },
      "add-group": {
        name: "Add group",
        icon: <IconCut size={16} />,
        canActivate: true,
      },
      "delete-group": {
        name: "Delete group",
        icon: <IconTrash size={16} />,
        canActivate: true,
      },
      "reslice-tiles": {
        name: "Re-slice tiles",
        icon: <IconGrid4x4 size={16} />,
        onClick: resliceTiles,
        canActivate: false,
      },
    }),
    [resliceTiles]
  );

  const onToolActivated = useCallback(
    (slug: string) => {
      dispatch(actions.setActiveTool(slug as Mode));
    },
    [dispatch]
  );

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
            ref={containerRef}
            id={constants.tilesetEditorContainerId}
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
                  allowSelect={false}
                  tileset={
                    s.activeTilesetId ? s.tilesets[s.activeTilesetId] : null
                  }
                />
              </Tabs.Panel>
            </Tabs>
          </Stack>
        </Flex>
        <Stack miw={200} style={{ flex: 1 }}>
          <ToolPalette
            activeTool={s.selectedTool}
            tools={toolPalette}
            onToolActivated={onToolActivated}
          />
          <Fieldset p={"xs"} legend="Grid settings">
            <Stack p={0}>
              <GridSizeInput
                defaultValue={s.grid.size}
                onChange={changeGridSize}
              />
            </Stack>
          </Fieldset>
        </Stack>
      </Flex>
    </>
  );
}
