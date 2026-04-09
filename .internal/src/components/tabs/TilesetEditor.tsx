import * as constants from "@/constants";
import { globals as g } from "@/globals";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { useSpotlightActions } from "@/hooks/useSpotlightActions";
import { actions, selectors } from "@/slices/tilesetEditor";
import { actions as uiActions } from "@/slices/ui";
import { store } from "@/store/store";
import { setActiveTilesetThunk, setToolThunk } from "@/thunks/tileset";
import { isAnimationTemplate } from "@/types/animation";
import { isNpcTemplate } from "@/types/npc";
import { TilesetTabName } from "@/types/tab";
import { isTileGroupTemplate } from "@/types/tilegroup";
import { Mode } from "@/types/tileset";
import { TemplateObject } from "@/types/tilesetobject";
import { collisionMaskStore } from "@/utils/maskStore";
import {
  npcSort,
  objectAnimationSort,
  tileGroupSort,
} from "@/utils/palette/sort";
import { Split } from "@gfazioli/mantine-split-pane";
import { Anchor, Group, ScrollArea, Stack, Tabs } from "@mantine/core";
import {
  IconEye,
  IconLetterZ,
  IconReplace,
  IconRun,
  IconScissors,
  IconSelectAll,
  IconShape,
  IconSquarePlus,
  IconTrash,
  IconUser,
} from "@tabler/icons-react";
import React, {
  ReactNode,
  use,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import ObjectPalette from "../ObjectPalette";
import TilesetButton from "../TilesetButton";
import Tip from "../Tip";
import ToolPalette, { ToolDescriptor } from "../ToolPalette";
import { renderNpc } from "../paletteObjects/Npc";
import { renderObjectAnimation } from "../paletteObjects/ObjectAnimation";
import { renderTileGroup } from "../paletteObjects/TileGroup";
import ColliderTool from "../tools/tileset/ColliderTool";
import NpcTool from "../tools/tileset/NpcTool";
import TileAnimationTool from "../tools/tileset/TileAnimationTool";
import TileReplaceTool from "../tools/tileset/TileReplaceTool";
import TileReslicerTool from "../tools/tileset/TileReslicerTool";
import ZIndexTool from "../tools/tileset/ZIndexTool";

export default function TilesetEditorTab({
  initPromise,
}: {
  initPromise: Promise<unknown>;
}) {
  const dispatch = useAppDispatch();
  const activeTab = useAppSelector((state) => state.ui.activeTab);

  // Register tileset-editor spotlight actions
  const tilesetSpotlightActions = useMemo(
    () => [
      {
        id: "toggle-hidden-tilesets",
        label: "Toggle hidden tilesets",
        description: "Toggle hidden tilesets",
        leftSection: <IconEye />,
        onClick: () => {
          const state = store.getState();
          const current = state.ui.flags.showHiddenTilesets;
          dispatch(uiActions.setFlags({ showHiddenTilesets: !current }));
        },
      },
      {
        id: "reset-colliders",
        label: "Reset tileset's colliders",
        description: "Remove all collider data from the active tileset",
        leftSection: <IconTrash />,
        onClick: () => {
          const state = store.getState();
          const ts = selectors.activeTileset(state);
          if (!ts) return;

          const changes = [];
          for (const id of ts.tiles.ids) {
            const obj = ts.tiles.entities[id];
            if (!isTileGroupTemplate(obj)) continue;

            if (obj.collisions.mask) {
              collisionMaskStore.delete(obj.collisions.mask);
            }

            changes.push({
              id: obj.id,
              changes: {
                collisions: {
                  mask: null,
                  shapes: [],
                  simplify: 1,
                },
              },
            });
          }
          dispatch(actions.updateManyTilesetObjects({ tsId: ts.id, changes }));
          dispatch(actions.clearSelection());
        },
      },
    ],
    [dispatch],
  );
  useSpotlightActions(
    "tileset-editor",
    tilesetSpotlightActions,
    activeTab === "tileset-editor",
  );

  const navigate = useNavigate();
  const { tsid: tsId, objid: objId } = useParams<{
    tsid?: string;
    objid?: string;
  }>();
  const location = useLocation();
  const selectedToolName = useAppSelector(
    (state) => state.tilesetEditor.selectedTool,
  );
  const paletteSelection = useAppSelector(selectors.paletteSelectedIds);

  // Defer visual updates to palette selection to keep interactions responsive
  const deferredPaletteSelection = useDeferredValue(paletteSelection);

  const activeTilesetId = useAppSelector(
    (state) => state.tilesetEditor.activeTilesetId,
  );
  const tilesets = useAppSelector(selectors.selectTilesets);
  const containerRef = useRef<HTMLDivElement>(null);
  const curTab = useAppSelector((state) => state.ui.tilesetTab);

  // This promise is created in the ShellApp and ensures the tileset editor (the
  // pixi.js canvas) is loaded and ready.
  use(initPromise);

  // Ensure the canvas is mounted in our container
  useEffect(() => {
    const container = containerRef.current!;
    const canvas = g.tilesetEditorApp!.canvas;

    if (!container.contains(canvas)) {
      container.appendChild(canvas);
    }

    // Set resizeTo after a frame to ensure the container has its final size
    requestAnimationFrame(() => {
      g.tilesetEditorApp!.resizeTo = container;
    });
  }, []);

  // Derive a tileset object from the active tileset id
  const ts = useMemo(() => {
    if (!activeTilesetId) return null;
    return tilesets[activeTilesetId] || null;
  }, [activeTilesetId, tilesets]);

  const deferredTs = useDeferredValue(ts);

  const setActivePaletteTab = useCallback(
    (tab: string | null) => {
      if (!tab) return;
      dispatch(uiActions.setTilesetTab(tab as TilesetTabName));
    },
    [dispatch],
  );

  // Select the tileset once it's available and not already active. This is
  // primarily called in response to URL changes.
  useEffect(() => {
    // If there's no tileset ID in the URL, clear the active tileset
    if (!tsId) {
      // If we're navigating away don't clear our tools, selection, tileset,
      // etc, because we may want to jump back. We only want to clear those
      // things if the tileset is deleted.
      const samePage = location.pathname.startsWith("/tilesets");
      if (!samePage) return;

      dispatch(setActiveTilesetThunk({ tsId: null }));
      return;
    }

    dispatch(setActiveTilesetThunk({ tsId, objId }));
  }, [tsId, dispatch, location, objId]);

  // This renders our list of tileset images for the left panel
  const tilesetImages = useMemo(
    () =>
      Object.values(tilesets).map((ts) => (
        <TilesetButton
          key={ts.id}
          ts={ts}
          onClick={() => navigate(`/tilesets/${ts.id}`)}
          isActive={ts.id === activeTilesetId}
        />
      )),
    [tilesets, navigate, activeTilesetId],
  );

  const handlePaneResize = () => {
    // Trigger redrawLayout when panels are resized
    // Use a small delay to ensure the DOM has updated
    requestAnimationFrame(() => {
      window.dispatchEvent(new Event("resize"));
    });
  };

  const selectedAnimation = useMemo(() => {
    if (!objId) return undefined;

    const state = store.getState();
    const obj = selectors.templateFromId(state, objId);
    if (obj && isAnimationTemplate(obj)) {
      return obj;
    }
    return undefined;
  }, [objId]);

  const hasTsSelected = ts !== null;
  const enableGroup = ts !== null && !ts.composite;

  const toolPalette: Partial<Record<Mode, ToolDescriptor>> = useMemo(
    () =>
      ({
        "reslice-tiles": {
          name: "Reslicer",
          icon: <IconScissors size={16} />,
          options: <TileReslicerTool />,
          enabled: enableGroup,
        },

        select: {
          name: "Select",
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
          icon: <IconRun size={16} />,
          options: (
            <TileAnimationTool
              key={selectedAnimation?.id}
              selectedAnimation={selectedAnimation}
            />
          ),
          enabled: hasTsSelected,
        },
        "make-npc": {
          name: "Make NPC",
          icon: <IconUser size={16} />,
          options: <NpcTool />,
          enabled: hasTsSelected,
        },
        "z-index": {
          name: "Set Z-Index",
          icon: <IconLetterZ size={16} />,
          options: <ZIndexTool />,
          enabled: hasTsSelected,
        },
        "draw-colliders": {
          name: "Draw colliders",
          icon: <IconShape size={16} />,
          options: <ColliderTool />,
          enabled: hasTsSelected,
        },
      }) satisfies Partial<Record<Mode, ToolDescriptor>>,
    [enableGroup, hasTsSelected, selectedAnimation],
  );

  const tool = selectedToolName && toolPalette[selectedToolName]!;
  const toolOptions = tool?.options;

  const onSelectObject = useCallback(
    async (obj: TemplateObject, e: React.MouseEvent) => {
      if (e.button === 2) return;
      await navigate(`/tilesets/${obj.tilesetId}/objects/${obj.id}`);
    },
    [navigate],
  );

  const onToolActivated = useCallback(
    (slug: string) => {
      const toolName = slug as Mode;
      dispatch(setToolThunk(toolName));
    },
    [dispatch],
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
                "Select a tool above to add or delete tile groups from the tileset.",
              );
            } else {
              tips.push(
                "Add new tile groups by creating them with the tools above.",
              );
            }
          } else {
            tips.push(
              <>
                Use the re-slice tool to create initial tiles.{" "}
                <Anchor underline="hover" onClick={onActivateReslicer}>
                  Activate reslicer
                </Anchor>
              </>,
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
        "Drag and drop an image file onto the tileset area to upload it.",
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
          <Stack h="100%" style={{ overflow: "hidden" }} pb="xl">
            <ScrollArea type="never" style={{ flex: 1 }}>
              <Stack p={0} pb="xl">
                {tilesetImages}
              </Stack>
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
                  onChange={setActivePaletteTab}
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
                      onSelectObject={onSelectObject}
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
                      onSelectObject={onSelectObject}
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
                      onSelectObject={onSelectObject}
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
          <Stack h="100%" style={{ overflow: "hidden" }} pb="xl">
            <ToolPalette
              activeTool={selectedToolName}
              tools={toolPalette}
              onToolActivated={onToolActivated}
              onToolDeactivated={onToolDeactivated}
            />

            <Tip tips={tips} />

            <ScrollArea type="never" style={{ flex: 1 }}>
              <Stack p={0} pb="xl">
                {toolOptions}
              </Stack>
            </ScrollArea>
          </Stack>
        </Split.Pane>
      </Split>
    </>
  );
}
