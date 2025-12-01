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
import { isAnimationTemplate } from "@/types/animation";
import { isNpcTemplate } from "@/types/npc";
import { TilesetTabName } from "@/types/tab";
import { isTileGroupTemplate } from "@/types/tilegroup";
import { Mode } from "@/types/tileset";
import {
  npcSort,
  objectAnimationSort,
  tileGroupSort,
} from "@/utils/palette/sort";
import { Split } from "@gfazioli/mantine-split-pane";
import { Anchor, Group, ScrollArea, Stack, Tabs } from "@mantine/core";
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
import ObjectPalette from "./ObjectPalette";
import TilesetButton from "./TilesetButton";
import Tip from "./Tip";
import ToolPalette, { ToolDescriptor } from "./ToolPalette";
import { renderNpc } from "./paletteObjects/Npc";
import { renderObjectAnimation } from "./paletteObjects/ObjectAnimation";
import { renderTileGroup } from "./paletteObjects/TileGroup";
import NpcTool from "./tools/tileset/NpcTool";
import TileAnimationTool from "./tools/tileset/TileAnimationTool";
import TileReplaceTool from "./tools/tileset/TileReplaceTool";
import TileReslicerTool from "./tools/tileset/TileReslicerTool";

export default function TilesetEditorTab({
  initPromise,
}: {
  initPromise: Promise<unknown>;
}) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { tsid: tsId } = useParams<{ tsid?: string }>();
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

  const ts = useMemo(() => {
    if (!activeTilesetId) return null;
    return tilesets[activeTilesetId] || null;
  }, [activeTilesetId, tilesets]);

  const deferredTs = useDeferredValue(ts);

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
    if (!tsId) return;
    if (!tilesets[tsId]) {
      dispatch(loadTilesetThunk({ tsId }));
    }
  }, [tsId, tilesets, dispatch]);

  // Select the tileset once it's available and not already active
  useEffect(() => {
    if (!tsId) return;
    const ts = tilesets[tsId];
    if (ts && activeTilesetId !== tsId) {
      dispatch(selectTilesetThunk(ts)).unwrap();
      dispatch(actions.setActiveTool(null));
    }
  }, [tsId, tilesets, activeTilesetId, dispatch]);

  const loadedTilesets = useAppSelector(selectors.selectTilesets);
  const tilesetImages = loadedTilesets.map((ts) => (
    <TilesetButton
      key={ts.id}
      ts={ts}
      onClick={() => navigate(`/tilesets/${ts.id}`)}
      isActive={ts.id === activeTilesetId}
    />
  ));

  const handlePaneResize = () => {
    // Trigger redrawLayout when panels are resized
    // Use a small delay to ensure the DOM has updated
    requestAnimationFrame(() => {
      window.dispatchEvent(new Event("resize"));
    });
  };

  const hasTsSelected = ts !== null;
  const enableGroup = ts !== null && !ts.composite;

  const toolPalette: Partial<Record<Mode, ToolDescriptor>> = useMemo(
    () => ({
      "reslice-tiles": {
        name: "Reslicer",
        icon: <IconGrid4x4 size={16} />,
        options: <TileReslicerTool />,
        enabled: enableGroup,
      },

      select: {
        name: "Select/move",
        icon: <IconSelectAll size={16} />,
        enabled: hasTsSelected,
      },
      "replace-group": {
        name: "Replace group",
        icon: <IconReplace size={16} />,
        options: <TileReplaceTool />,
        enabled: hasTsSelected,
      },
      "add-group": {
        name: "Add group",
        icon: <IconSquarePlus size={16} />,
        enabled: hasTsSelected,
      },
      "delete-group": {
        name: "Delete group",
        icon: <IconTrash size={16} />,
        enabled: hasTsSelected,
      },

      animate: {
        name: "Animate",
        icon: <IconKeyframes size={16} />,
        options: <TileAnimationTool />,
        enabled: hasTsSelected,
      },
      "make-npc": {
        name: "Make NPC",
        icon: <IconUser size={16} />,
        options: <NpcTool />,
        enabled: hasTsSelected,
      },
    }),
    [enableGroup, hasTsSelected]
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
      if (deferredTs) {
        const hasTiles = deferredTs.tiles.ids.length > 0;
        const hasPinned = Object.values(deferredTs.tiles.entities)
          .filter(isTileGroupTemplate)
          .some((obj) => obj.pinned);

        if (deferredTs.composite) {
          // Composite tilesets cannot be edited
        } else {
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
  }, [deferredTs, dispatch, tilesetImages.length, tool]);

  return (
    <>
      <Split h="100dvh" style={{ flex: 1 }}>
        {/* Left toolbar - tileset list */}
        <Split.Pane
          initialWidth={300}
          minWidth={200}
          maxWidth={500}
          onResizeEnd={handlePaneResize}
        >
          <Stack h="100%" style={{ overflow: "hidden" }}>
            <ScrollArea type="never" style={{ flex: 1 }}>
              <Stack pb={50}>{tilesetImages}</Stack>
            </ScrollArea>
          </Stack>
        </Split.Pane>

        <Split.Resizer />

        {/* Center panel with editor and palette */}
        <Split.Pane grow>
          <Split
            orientation="horizontal"
            style={{
              height: "100%",
              minHeight: 0,
              minWidth: 0,
              position: "relative",
            }}
          >
            {/* Top: Editor canvas */}
            <Split.Pane grow minHeight={200} onResizeEnd={handlePaneResize}>
              <div
                ref={containerRef}
                id={constants.tilesetEditorContainerId}
                style={{
                  width: "100%",
                  height: "100%",
                  overflow: "hidden",
                }}
              ></div>
            </Split.Pane>

            <Split.Resizer />

            {/* Bottom: Object palette */}
            <Split.Pane
              initialHeight={400}
              minHeight={150}
              maxHeight={600}
              onResizeEnd={handlePaneResize}
            >
              <Stack style={{ height: "100%" }} p={0}>
                <Tabs
                  value={curTab}
                  onChange={setActiveTab}
                  className="flex-overflow"
                >
                  <Tabs.List>
                    <Tabs.Tab value={"objects"}>
                      <Group gap="xs">Objects</Group>
                    </Tabs.Tab>
                    <Tabs.Tab value="animations">
                      <Group gap="xs">Animations</Group>
                    </Tabs.Tab>

                    <Tabs.Tab value="npcs">
                      <Group gap="xs">NPCs</Group>
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
                      tileset={deferredTs ?? undefined}
                      selectedObjects={deferredPaletteSelection}
                      filter={isTileGroupTemplate}
                      renderObject={renderTileGroup}
                      sort={tileGroupSort}
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
                      minScale={1}
                      defaultScale={4}
                      maxScale={8}
                      tileset={deferredTs ?? undefined}
                      selectedObjects={deferredPaletteSelection}
                      filter={isAnimationTemplate}
                      renderObject={renderObjectAnimation}
                      sort={objectAnimationSort}
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
                      minScale={1}
                      defaultScale={4}
                      maxScale={8}
                      tileset={deferredTs ?? undefined}
                      selectedObjects={deferredPaletteSelection}
                      filter={isNpcTemplate}
                      renderObject={renderNpc}
                      sort={npcSort}
                    />
                  </Tabs.Panel>
                </Tabs>
              </Stack>
            </Split.Pane>
          </Split>
        </Split.Pane>

        <Split.Resizer />

        {/* Right toolbar - tools and options */}
        <Split.Pane
          initialWidth={300}
          minWidth={200}
          maxWidth={500}
          onResizeEnd={handlePaneResize}
        >
          <Stack h="100%" style={{ overflow: "hidden" }}>
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
        </Split.Pane>
      </Split>
    </>
  );
}
