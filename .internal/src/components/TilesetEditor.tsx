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
  IconSelectAll,
  IconSquarePlus,
  IconTrash,
} from "@tabler/icons-react";
import { use, useCallback, useEffect, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import HelpHoverCard from "./HelpHoverCard";
import ObjectPalette from "./ObjectPalette";
import TilesetButton from "./TilesetButton";
import Tip from "./Tip";
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

  const activeTileset = useMemo(() => {
    if (!activeTilesetId) return null;
    return tilesets[activeTilesetId] || null;
  }, [activeTilesetId, tilesets]);

  useEffect(() => {
    const container = containerRef.current!;
    const canvas = g.tilesetEditorApp!.canvas;
    g.tilesetEditorApp!.resizeTo = container;
    if (!container.contains(canvas)) {
      container.appendChild(canvas);
    }
  }, []);

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
      dispatch(selectTilesetThunk(ts)).unwrap();
      dispatch(actions.setActiveTool(null));
    }
  }, [tsid, tilesets, activeTilesetId, dispatch]);

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
      select: {
        name: "Select/move",
        icon: <IconSelectAll size={16} />,
        enabled: !!activeTilesetId,
      },
      "replace-group": {
        name: "Replace group",
        icon: <IconReplace size={16} />,
        options: <TileReplaceOptions />,
        enabled: !!activeTilesetId,
      },
      "add-group": {
        name: "Add group",
        icon: <IconSquarePlus size={16} />,
        enabled: !!activeTilesetId,
      },
      "delete-group": {
        name: "Delete group",
        icon: <IconTrash size={16} />,
        enabled: !!activeTilesetId,
      },

      "reslice-tiles": {
        name: "Reslicer",
        icon: <IconGrid4x4 size={16} />,
        options: <TileReslicer />,
        enabled: !!activeTilesetId,
      },
      animate: {
        name: "Animate",
        icon: <IconKeyframes size={16} />,
        options: <TileAnimationOptions />,
        enabled: !!activeTilesetId,
      },
    }),
    [activeTilesetId]
  );

  const tool = selectedToolName && toolPalette[selectedToolName]!;
  const toolOptions = tool?.options;

  const onToolActivated = useCallback(
    (slug: string) => {
      dispatch(actions.setActiveTool(slug as Mode));
    },
    [dispatch]
  );

  const onToolDeactivated = useCallback(() => {
    dispatch(actions.setActiveTool(null));
  }, [dispatch]);

  const tips: string[] = useMemo(() => {
    const tips: string[] = [];

    if (!tool) {
      if (activeTileset) {
        const hasTiles = activeTileset.tiles.ids.length > 0;
        const hasPinned = Object.values(activeTileset.tiles.entities).some(
          (obj) => obj.pinned
        );

        if (hasTiles) {
          if (hasPinned) {
            tips.push(
              "Select a tool above to add or delete tile groups from the tileset."
            );
          } else {
            tips.push(
              "Add new tile groups by creating them with the tools above."
            );
          }
        } else {
          tips.push("Using the re-slice tool to create initial tiles.");
        }
      } else {
        if (tilesetImages.length === 0) {
          tips.push("Upload a tileset to get started.");
        } else {
          tips.push("Select a tileset from the left to work on it.");
        }
      }
      tips.push(
        "Drag and drop an image file onto the tileset area to upload it."
      );
    }
    return tips;
  }, [activeTileset, tilesetImages.length, tool]);

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
            onToolDeactivated={onToolDeactivated}
          />

          <Tip tips={tips} />

          {toolOptions}
        </Stack>
      </Flex>
    </>
  );
}
