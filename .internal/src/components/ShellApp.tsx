import { init as mapInit } from "@/editor/map/init";
import { init as tsInit } from "@/editor/tileset/init";
import { globals as g } from "@/globals";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { actions as uiActions } from "@/slices/ui";
import { loadMapThunk } from "@/thunks/map";
import { loadTilesetsThunk } from "@/thunks/tileset";
import { TabName } from "@/types/tab";
import { AppShell, Group, Tabs, Text } from "@mantine/core";
import "@mantine/core/styles.css";
import { Dropzone, FileWithPath } from "@mantine/dropzone";
import "@mantine/dropzone/styles.css";
import { useDisclosure } from "@mantine/hooks";
import { IconUpload, IconX } from "@tabler/icons-react";
import { ReactFlowProvider } from "@xyflow/react";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { shallowEqual } from "react-redux";
import { log } from "../log";
import DialogueTab from "./Dialogue";
import MapEditorTab from "./MapEditor";
import NpcEditorTab from "./NpcEditor";
import PanelLoader from "./PanelLoader";
import PreviewTab from "./Preview";
import TilesetEditorTab from "./TilesetEditor";
import UploadAssetModal from "./UploadAssetModal";

declare global {
  interface Window {
    gl: {
      markers: {
        record: (slug: string) => void;
        clear: (slug: string) => void;
      };
      nav: {
        clearCache: () => void;
      };
    };
  }
}

// PanelLoader moved to its own component file.

export function ShellApp() {
  const dispatch = useAppDispatch();
  const [draggedFiles, setDraggedFiles] = useState<File[] | null>(null);
  const [assetTypeOpened, { open: openAssetType, close: closeAssetType }] =
    useDisclosure(false);
  // Select only the fields we need and use shallowEqual so unrelated ui changes
  // don't cause ShellApp to re-render.
  const { activeTab, mountedTabs, loadingMessage } = useAppSelector(
    (state) => ({
      activeTab: state.ui.activeTab,
      mountedTabs: state.ui.mountedTabs,
      loadingMessage: state.ui.loadingMessage,
    }),
    shallowEqual
  );

  // Initial data loading now handled via Suspense boundaries below.

  const handleTabChange = (value: TabName | null) => {
    if (!value) return;

    dispatch(uiActions.setLoadingMessage(null));
    dispatch(uiActions.setTab(value));
    dispatch(uiActions.mountTab(value));
  };

  useEffect(() => {
    if (import.meta.hot) {
      const fn = () => {
        log.info({ dev: true, color: "green" }, "Reloading level");
        // FIXME lift state
        // setReloadCount((c) => c + 1);
      };
      import.meta.hot.on("gl:level-reload", fn);

      return () => {
        import.meta.hot!.off("gl:level-reload", fn);
      };
    }
  }, []);

  const onDrop = useCallback(
    (files: FileWithPath[]) => {
      setDraggedFiles(files);
      openAssetType();
    },
    [openAssetType]
  );

  const tilesetInitPromise = useMemo(async () => {
    await dispatch(loadTilesetsThunk()).unwrap();
    const app = await tsInit();
    g.tilesetEditorApp = app;
    return app;
  }, [dispatch]);

  const mapInitPromise = useMemo(async () => {
    await tilesetInitPromise;
    const app = await mapInit();
    g.mapEditorApp = app;
    // This has to happen after the app is initialized, because it depends on
    // the map reconciler existing.
    try {
      await dispatch(loadMapThunk()).unwrap();
    } catch (e) {
      log.error({ error: e }, "Failed to load map");
    }
    return app;
  }, [tilesetInitPromise, dispatch]);

  return (
    <>
      {draggedFiles && (
        <UploadAssetModal
          files={draggedFiles}
          opened={assetTypeOpened}
          closeModal={closeAssetType}
        />
      )}

      <Dropzone.FullScreen onDrop={onDrop} multiple>
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
              Drag assets here
            </Text>
            <Text size="sm" c="dimmed" inline mt={7}>
              Attach as many assets as you like.
            </Text>
          </div>
        </Group>
      </Dropzone.FullScreen>

      <AppShell withBorder={true}>
        <AppShell.Main>
          <Tabs
            value={activeTab}
            onChange={(tab) => handleTabChange(tab as TabName)}
          >
            <Tabs.List>
              <Tabs.Tab value="map-editor">Map</Tabs.Tab>
              <Tabs.Tab value="tileset-editor">Tilesets</Tabs.Tab>
              <Tabs.Tab value="npc-editor">NPCs</Tabs.Tab>
              <Tabs.Tab value="dialogue-editor">Dialogue</Tabs.Tab>
              <Tabs.Tab value="preview">Level Preview</Tabs.Tab>
            </Tabs.List>

            {mountedTabs["preview"] && (
              <Tabs.Panel value="preview">
                <PreviewTab />
              </Tabs.Panel>
            )}

            {mountedTabs["map-editor"] && (
              <Tabs.Panel value="map-editor">
                <Suspense fallback={<PanelLoader message={loadingMessage} />}>
                  <MapEditorTab initPromise={mapInitPromise} />
                </Suspense>
              </Tabs.Panel>
            )}

            {mountedTabs["tileset-editor"] && (
              <Tabs.Panel value="tileset-editor">
                <Suspense fallback={<PanelLoader message={loadingMessage} />}>
                  <TilesetEditorTab initPromise={tilesetInitPromise} />
                </Suspense>
              </Tabs.Panel>
            )}

            {mountedTabs["npc-editor"] && (
              <Tabs.Panel value="npc-editor">
                <NpcEditorTab />
              </Tabs.Panel>
            )}

            {mountedTabs["dialogue-editor"] && (
              <Tabs.Panel value="dialogue-editor">
                <ReactFlowProvider>
                  <DialogueTab />
                </ReactFlowProvider>
              </Tabs.Panel>
            )}
          </Tabs>
        </AppShell.Main>
      </AppShell>
    </>
  );
}
