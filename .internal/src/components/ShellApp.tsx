import "@mantine/core/styles.css";
import "@mantine/dropzone/styles.css";

import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { getMapInitPromise, getTilesetInitPromise } from "@/init/editorInit";
import { pathToTab, tabToPath } from "@/routes/tabs";
import { actions as uiActions } from "@/slices/ui";
import { resetMapThunk } from "@/thunks/map";
import { MainTabName } from "@/types/tab";
import { AppShell, Group, Tabs, Text } from "@mantine/core";
import { Dropzone, FileWithPath } from "@mantine/dropzone";
import { useDisclosure } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { Spotlight, SpotlightActionData } from "@mantine/spotlight";
import { IconSearch, IconTrash, IconUpload, IconX } from "@tabler/icons-react";
import { ReactFlowProvider } from "@xyflow/react";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { shallowEqual } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import DialogueTab from "./Dialogue";
import MapEditorTab from "./MapEditor";
import NpcEditorTab from "./NpcEditor";
import PanelLoader from "./PanelLoader";
import PreviewTab from "./Preview";
import StoryTab from "./StoryTab";
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
  const navigate = useNavigate();
  const location = useLocation();
  const [draggedFiles, setDraggedFiles] = useState<File[] | null>(null);
  const [assetTypeOpened, { open: openAssetType, close: closeAssetType }] =
    useDisclosure(false);

  const actions: SpotlightActionData[] = useMemo(
    () => [
      {
        id: "reset-map",
        label: "Reset map",
        description: "Delete and re-create the map",
        onClick: () => {
          modals.openConfirmModal({
            title: "Reset map?",
            children: (
              <Text size="sm">
                This will delete and re-create the current map. This action
                cannot be undone.
              </Text>
            ),
            labels: { confirm: "Reset map", cancel: "Cancel" },
            confirmProps: { color: "red" },
            centered: true,
            withCloseButton: false,
            onConfirm: () => dispatch(resetMapThunk()),
          });
        },
        leftSection: <IconTrash size={24} stroke={1.5} />,
      },
    ],
    [dispatch]
  );

  const { activeTab, mountedTabs, loadingMessages } = useAppSelector(
    (state) => ({
      activeTab: state.ui.activeTab,
      mountedTabs: state.ui.mountedTabs,
      loadingMessages: state.ui.loadingMessages,
    }),
    shallowEqual
  );

  const handleTabChange = useCallback(
    (value: MainTabName | null) => {
      if (!value) return;

      // Navigate to the canonical URL for the selected tab; the URL change
      // will be observed below and will dispatch Redux updates.
      const canonical = tabToPath(value);
      if (location.pathname !== canonical) {
        navigate(canonical);
      }
    },
    [navigate, location.pathname]
  );

  // When the URL path changes, update Redux tab state to match
  useEffect(() => {
    const nextTab = pathToTab(location.pathname);
    if (nextTab !== activeTab) {
      dispatch(uiActions.clearLoadingMessages());
      dispatch(uiActions.setTab(nextTab));
      dispatch(uiActions.mountTab(nextTab));
    }
  }, [location.pathname, activeTab, dispatch]);

  const onDrop = useCallback(
    (files: FileWithPath[]) => {
      setDraggedFiles(files);
      openAssetType();
    },
    [openAssetType]
  );

  // Get the cached init promises that persist across HMR
  const tilesetInitPromise = useMemo(() => getTilesetInitPromise(), []);
  const mapInitPromise = useMemo(() => getMapInitPromise(), []);

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
            onChange={(tab) => handleTabChange(tab as MainTabName)}
          >
            <Tabs.List style={{ alignItems: "center" }}>
              <Tabs.Tab value="map-editor">Map</Tabs.Tab>
              <Tabs.Tab value="tileset-editor">Tilesets</Tabs.Tab>
              <Tabs.Tab value="npc-editor">NPCs</Tabs.Tab>
              <Tabs.Tab value="story-editor">Story</Tabs.Tab>
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
                <Suspense
                  fallback={<PanelLoader message={loadingMessages.at(-1)} />}
                >
                  <MapEditorTab initPromise={mapInitPromise} />
                </Suspense>
              </Tabs.Panel>
            )}

            {mountedTabs["tileset-editor"] && (
              <Tabs.Panel value="tileset-editor">
                <Suspense
                  fallback={<PanelLoader message={loadingMessages.at(-1)} />}
                >
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

            {mountedTabs["story-editor"] && (
              <Tabs.Panel value="story-editor">
                <ReactFlowProvider>
                  <StoryTab />
                </ReactFlowProvider>
              </Tabs.Panel>
            )}
          </Tabs>
        </AppShell.Main>
      </AppShell>

      <Spotlight
        actions={actions}
        centered
        nothingFound="Nothing found..."
        highlightQuery
        searchProps={{
          leftSection: <IconSearch size={20} stroke={1.5} />,
          placeholder: "Search...",
        }}
      />
    </>
  );
}

// Enable HMR for this component
if (import.meta.hot) {
  import.meta.hot.accept();
}
