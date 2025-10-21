import * as constants from "@/constants";
import { globals as g } from "@/globals";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { actions, selectors } from "@/slices/tilesetEditor";
import { loadTilesetThunk, selectTilesetThunk } from "@/thunks/tileset";
import { Mode } from "@/types/tileset";
import { Flex, Group, ScrollArea, Stack, Tabs, Text } from "@mantine/core";
import {
  IconGrid4x4,
  IconKeyframes,
  IconReplace,
  IconSquarePlus,
  IconTrash,
} from "@tabler/icons-react";
import { use, useCallback, useEffect, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import HelpHoverCard from "./HelpHoverCard";
import ObjectPalette from "./ObjectPalette";
import TilesetButton from "./TilesetButton";
import ToolPalette, { ToolDescriptor } from "./ToolPalette";
import TileAnimationOptions from "./toolOptions/TileAnimationOptions";
import TileReplaceOptions from "./toolOptions/TileReplaceOptions";
import TileReslicer from "./toolOptions/TileReslicer";

export default function TilesetEditorTab({
  initPromise,
}: {
  initPromise: Promise<unknown>;
}) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { tsid } = useParams<{ tsid?: string }>();
  const selectedToolName = useAppSelector(
    (state) => state.tilesetEditor.selectedTool
  );
  const activeTilesetId = useAppSelector(
    (state) => state.tilesetEditor.activeTilesetId
  );
  const tilesets = useAppSelector((state) => state.tilesetEditor.tilesets);
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

  const loadedTilesets = useAppSelector(selectors.selectTilesets);
  const tilesetImages = loadedTilesets.map((ts) => (
    <TilesetButton
      key={ts.id}
      ts={ts}
      onClick={() => navigate(`/tilesets/${ts.id}`)}
      isActive={ts.id === activeTilesetId}
    />
  ));

  const toolPalette: Partial<Record<Mode, ToolDescriptor>> = useMemo(
    () => ({
      "replace-group": {
        name: "Replace group",
        icon: <IconReplace size={16} />,
        options: <TileReplaceOptions />,
        disabled: !activeTilesetId,
      },
      "add-group": {
        name: "Add group",
        icon: <IconSquarePlus size={16} />,
        disabled: !activeTilesetId,
      },
      "delete-group": {
        name: "Delete group",
        icon: <IconTrash size={16} />,
        disabled: !activeTilesetId,
      },
      "reslice-tiles": {
        name: "Reslicer",
        icon: <IconGrid4x4 size={16} />,
        options: <TileReslicer />,
        disabled: !activeTilesetId,
      },
      animate: {
        name: "Animate",
        icon: <IconKeyframes size={16} />,
        options: <TileAnimationOptions />,
        disabled: !activeTilesetId,
      },
    }),
    [activeTilesetId]
  );

  const tool = selectedToolName && toolPalette[selectedToolName];
  const toolOptions = tool?.options;

  const onToolActivated = useCallback(
    (slug: string) => {
      dispatch(actions.setActiveTool(slug as Mode));
    },
    [dispatch]
  );

  // Ensure the tileset for the current URL is loaded
  useEffect(() => {
    if (!tsid) return;
    if (!tilesets[tsid]) {
      dispatch(loadTilesetThunk(tsid));
    }
  }, [tsid, tilesets, dispatch]);

  // Select the tileset once it's available and not already active
  useEffect(() => {
    if (!tsid) return;
    const ts = tilesets[tsid];
    if (ts && activeTilesetId !== tsid) {
      dispatch(selectTilesetThunk(ts));
    }
  }, [tsid, tilesets, activeTilesetId, dispatch]);

  return (
    <>
      <Flex h="100dvh" style={{ flex: 1 }}>
        <Stack miw={300} h="100%" style={{ flex: 1, overflow: "hidden" }}>
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
                  tileset={activeTilesetId ? tilesets[activeTilesetId] : null}
                />
              </Tabs.Panel>
            </Tabs>
          </Stack>
        </Flex>
        <Stack miw={300} style={{ flex: 1 }}>
          <ToolPalette
            activeTool={selectedToolName}
            tools={toolPalette}
            onToolActivated={onToolActivated}
          />

          {toolOptions}
        </Stack>
      </Flex>
    </>
  );
}
