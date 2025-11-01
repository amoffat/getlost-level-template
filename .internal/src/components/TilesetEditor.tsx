import * as constants from "@/constants";
import { globals as g } from "@/globals";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { actions, selectors } from "@/slices/tilesetEditor";
import { actions as uiActions } from "@/slices/ui";
import {
  loadTilesetThunk,
  selectTilesetThunk,
  setToolThunk,
} from "@/thunks/tileset";
import { TilesetTabName } from "@/types/tab";
import { isTileGroup } from "@/types/tilegroup";
import { Mode } from "@/types/tileset";
import {
  Anchor,
  Flex,
  Group,
  ScrollArea,
  Stack,
  Tabs,
  Text,
} from "@mantine/core";
import {
  IconGrid4x4,
  IconKeyframes,
  IconReplace,
  IconSelectAll,
  IconSquarePlus,
  IconTrash,
  IconUser,
} from "@tabler/icons-react";
import {
  ReactNode,
  use,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import HelpHoverCard from "./HelpHoverCard";
import ObjectPalette from "./ObjectPalette";
import TilesetButton from "./TilesetButton";
import Tip from "./Tip";
import ToolPalette, { ToolDescriptor } from "./ToolPalette";
import { renderObjectAnimation } from "./paletteObjects/ObjectAnimation";
import { renderTileGroup } from "./paletteObjects/TileGroup";
import NpcOptions from "./toolOptions/NpcOptions";
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
  const paletteSelection = useAppSelector(selectors.paletteSelectedIds);

  // Defer visual updates to palette selection to keep interactions responsive
  const deferredPaletteSelection = useDeferredValue(paletteSelection);

  const activeTilesetId = useAppSelector(
    (state) => state.tilesetEditor.activeTilesetId
  );
  const tilesets = useAppSelector((state) => state.tilesetEditor.tilesets);
  const containerRef = useRef<HTMLDivElement>(null);
  const curTab = useAppSelector((state) => state.ui.tilesetTab);

  use(initPromise);

  const activeTileset = useMemo(() => {
    if (!activeTilesetId) return null;
    return tilesets[activeTilesetId] || null;
  }, [activeTilesetId, tilesets]);

  const deferredActiveTileset = useDeferredValue(activeTileset);

  const setActiveTab = useCallback(
    (tab: string | null) => {
      if (!tab) return;
      dispatch(uiActions.setTilesetTab(tab as TilesetTabName));
    },
    [dispatch]
  );

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
      "make-npc": {
        name: "Make NPC",
        icon: <IconUser size={16} />,
        options: <NpcOptions />,
        enabled: !!activeTilesetId,
      },
    }),
    [activeTilesetId]
  );

  const tool = selectedToolName && toolPalette[selectedToolName]!;
  const toolOptions = tool?.options;

  const onToolActivated = useCallback(
    (slug: string) => {
      const toolName = slug as Mode;
      dispatch(setToolThunk(toolName));
    },
    [dispatch]
  );

  const onToolDeactivated = useCallback(() => {
    dispatch(setToolThunk(null));
  }, [dispatch]);

  const tips: ReactNode[] = useMemo(() => {
    const tips: ReactNode[] = [];

    const onActivateReslicer = () => {
      dispatch(setToolThunk("reslice-tiles"));
    };

    if (!tool) {
      if (deferredActiveTileset) {
        const hasTiles = deferredActiveTileset.tiles.ids.length > 0;
        const hasPinned = Object.values(deferredActiveTileset.tiles.entities)
          .filter(isTileGroup)
          .some((obj) => obj.pinned);

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
          tips.push(
            <>
              Use the re-slice tool to create initial tiles.{" "}
              <Anchor underline="hover" onClick={onActivateReslicer}>
                Activate reslicer
              </Anchor>
            </>
          );
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
  }, [deferredActiveTileset, dispatch, tilesetImages.length, tool]);

  return (
    <>
      <Flex h="100dvh" style={{ flex: 1 }}>
        <Stack miw={300} h="100%" style={{ flex: 1, overflow: "hidden" }}>
          <ScrollArea type="never" style={{ flex: 1 }}>
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
            <Tabs
              value={curTab}
              onChange={setActiveTab}
              className="flex-overflow"
            >
              <Tabs.List>
                <Tabs.Tab value={"objects"}>
                  <Group gap="xs">
                    Objects
                    <HelpHoverCard>
                      <Text size="sm">
                        Objects are tiles or groups of tiles that can be placed
                        in the map.
                      </Text>
                    </HelpHoverCard>
                  </Group>
                </Tabs.Tab>
                <Tabs.Tab value="animations">
                  <Group gap="xs">
                    Animations
                    <HelpHoverCard>
                      <Text size="sm">
                        Animations are sequences of frames composed of tiles or
                        tile groups.
                      </Text>
                    </HelpHoverCard>
                  </Group>
                </Tabs.Tab>

                <Tabs.Tab value="npcs">
                  <Group gap="xs">
                    NPCs
                    <HelpHoverCard>
                      <Text size="sm">
                        Animations are sequences of frames composed of tiles or
                        tile groups.
                      </Text>
                    </HelpHoverCard>
                  </Group>
                </Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel
                value="objects"
                style={{
                  flex: 1,
                  minHeight: 0,
                  height: "100%",
                  display: "flex",
                }}
              >
                <ObjectPalette
                  tileset={deferredActiveTileset}
                  selectedObjects={deferredPaletteSelection}
                  renderObject={renderTileGroup}
                />
              </Tabs.Panel>
              <Tabs.Panel
                value="animations"
                style={{
                  flex: 1,
                  minHeight: 0,
                  height: "100%",
                  display: "flex",
                }}
              >
                <ObjectPalette
                  tileset={deferredActiveTileset}
                  selectedObjects={deferredPaletteSelection}
                  renderObject={renderObjectAnimation}
                />
              </Tabs.Panel>
              <Tabs.Panel
                value="npcs"
                style={{
                  flex: 1,
                  minHeight: 0,
                  height: "100%",
                  display: "flex",
                }}
              >
                <ObjectPalette
                  tileset={deferredActiveTileset}
                  selectedObjects={deferredPaletteSelection}
                  renderObject={renderObjectAnimation}
                />
              </Tabs.Panel>
            </Tabs>
          </Stack>
        </Flex>
        <Stack miw={300} h="100%" style={{ flex: 1, overflow: "hidden" }}>
          <ToolPalette
            activeTool={selectedToolName}
            tools={toolPalette}
            onToolActivated={onToolActivated}
            onToolDeactivated={onToolDeactivated}
          />

          <Tip tips={tips} />

          <ScrollArea type="never" style={{ flex: 1 }}>
            <Stack p={0} pb={50}>
              {toolOptions}
            </Stack>
          </ScrollArea>
        </Stack>
      </Flex>
    </>
  );
}
