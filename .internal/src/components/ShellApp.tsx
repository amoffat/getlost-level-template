import "@gfazioli/mantine-split-pane/styles.css";
import "@mantine/core/styles.css";
import "@mantine/dropzone/styles.css";

import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import {
  getMapInitPromise,
  getStoryInitPromise,
  getTilesetInitPromise,
} from "@/init/editorInit";
import { pathToTab, tabToPath } from "@/routes/tabs";
import { actions as uiActions } from "@/slices/ui";
import { store } from "@/store/store";
import { MainTabName } from "@/types/tab";
import { hasNewerEngineVersion } from "@/utils/version";
import { AppShell, Group, Tabs, Text } from "@mantine/core";
import { Dropzone, FileWithPath } from "@mantine/dropzone";
import { useDisclosure } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconUpload, IconX } from "@tabler/icons-react";
import { ReactFlowProvider } from "@xyflow/react";
import {
  Suspense,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { shallowEqual } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import MapEditorTab from "./tabs/MapEditor";
import PanelLoader from "./PanelLoader";
import PreviewTab from "./Preview";
import Spotlight from "./Spotlight";
import DialogueTab from "./tabs/DialogueTab";
import StoryTab from "./tabs/StoryTab";
import TilesetEditorTab from "./tabs/TilesetEditor";
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

export function ShellApp() {
  const dispatch = useAppDispatch();
  const activeTab = useAppSelector((state) => state.ui.activeTab);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  // Check for newer engine version on mount
  useEffect(() => {
    const checkVersion = async () => {
      try {
        // Wait a few seconds before checking
        await new Promise((resolve) => setTimeout(resolve, 3000));

        const hasNewer = await hasNewerEngineVersion();
        if (hasNewer) {
          modals.openContextModal({
            modal: "confirm",
            title: "Update Available",
            centered: true,
            withCloseButton: true,
            innerProps: {
              makeItems: () => [
                {
                  ok: true,
                  message: "The editor will update",
                },
                {
                  ok: true,
                  message: "It will migrate your assets automatically",
                },
                {
                  ok: false,
                  message: "You may need to migrate your level code manually",
                },
                {
                  ok: true,
                  message: "The upgrade is reversible",
                },
              ],
              confirmLabel: "Ok, upgrade",
              msg: "There's a new version of the editor available. Please update now.",
              onConfirm: async () => {
                const resp = await fetch("/api/exec/upgrade.py", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({}),
                });
                if (!resp.ok) {
                  const errorData = await resp.json().catch(() => ({
                    error: resp.statusText,
                    stderr: "Unknown error",
                  }));
                  const msg = `${errorData.error}: ${errorData.stderr}`;

                  notifications.show({
                    title: "Upgrade Failed",
                    color: "red",
                    message: `Failed to upgrade: ${msg}`,
                    autoClose: 3000,
                  });
                } else {
                  notifications.show({
                    title: "Upgrade succesful",
                    color: "green",
                    message:
                      "The editor has been upgraded successfully. The page will now reload.",
                    onClose: () => {
                      window.location.reload();
                    },
                  });
                }
              },
            },
          });
        }
      } catch (error) {
        console.error("Failed to check for newer engine version:", error);
      }
    };

    checkVersion();
  }, []);

  // Sync tab changes with URL path
  useEffect(() => {
    const nextTab = pathToTab(pathname);
    if (nextTab !== activeTab) {
      dispatch(uiActions.clearLoadingMessages());
      dispatch(uiActions.setTab(nextTab));
    }
  }, [pathname, activeTab, dispatch]);

  // Handle tab changes by updating the URL path
  const handleTabChange = useCallback(
    (value: MainTabName | null) => {
      if (!value) return;
      let canonical = tabToPath(value);

      // If navigating to tileset editor, preserve the active tileset ID in the
      // URL. This makes it easy to jump back and forth between the map and
      // tileset editor.
      if (value === "tileset-editor") {
        const state = store.getState();
        const tsId = state.tilesetEditor?.activeTilesetId;
        if (tsId) {
          canonical += `/${tsId}`;
        }
      }

      if (pathnameRef.current !== canonical) {
        navigate(canonical);
      }
    },
    [navigate],
  );

  // Using memo on this allows us to not have to re-render the entire ShellApp
  // when a tab changes.
  return <ShellAppContent onTabChange={handleTabChange} />;
}

type ShellAppContentProps = {
  onTabChange: (value: MainTabName | null) => void;
};

const ShellAppContent = memo(function ShellAppContent({
  onTabChange,
}: ShellAppContentProps) {
  const [draggedFiles, setDraggedFiles] = useState<File[] | null>(null);
  const [assetTypeOpened, { open: openAssetType, close: closeAssetType }] =
    useDisclosure(false);
  const [isPendingTab, startTransition] = useTransition();

  const { activeTab, mountedTabs, loadingMessages } = useAppSelector(
    (state) => ({
      activeTab: state.ui.activeTab,
      mountedTabs: state.ui.mountedTabs,
      loadingMessages: state.ui.loadingMessages,
    }),
    shallowEqual,
  );

  const onDrop = useCallback(
    (files: FileWithPath[]) => {
      setDraggedFiles(files);
      openAssetType();
    },
    [openAssetType],
  );

  const handleTabChangeWithFeedback = useCallback(
    (tab: MainTabName | null) => {
      if (tab && tab !== activeTab) {
        startTransition(() => {
          onTabChange(tab);
        });
      } else {
        onTabChange(tab);
      }
    },
    [activeTab, onTabChange],
  );

  // Get the cached init promises that persist across HMR
  const tilesetInitPromise = useMemo(() => getTilesetInitPromise(), []);
  const mapInitPromise = useMemo(() => getMapInitPromise(), []);
  const storyInitPromise = useMemo(() => getStoryInitPromise(), []);

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
            onChange={(tab) =>
              handleTabChangeWithFeedback(tab as MainTabName | null)
            }
          >
            <Tabs.List style={{ alignItems: "center" }}>
              <Tabs.Tab value="map-editor">Map</Tabs.Tab>
              <Tabs.Tab value="tileset-editor">Tilesets</Tabs.Tab>
              <Tabs.Tab value="story-editor">Story</Tabs.Tab>
              <Tabs.Tab value="dialogue-editor">Dialogue</Tabs.Tab>
              <Tabs.Tab value="preview">Preview</Tabs.Tab>
            </Tabs.List>

            <PanelLoader visible={isPendingTab} />

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

            {mountedTabs["dialogue-editor"] && (
              <Tabs.Panel value="dialogue-editor">
                <Suspense
                  fallback={<PanelLoader message={loadingMessages.at(-1)} />}
                >
                  <ReactFlowProvider>
                    <DialogueTab initPromise={storyInitPromise} />
                  </ReactFlowProvider>
                </Suspense>
              </Tabs.Panel>
            )}

            {mountedTabs["story-editor"] && (
              <Tabs.Panel value="story-editor">
                <Suspense
                  fallback={<PanelLoader message={loadingMessages.at(-1)} />}
                >
                  <ReactFlowProvider>
                    <StoryTab initPromise={storyInitPromise} />
                  </ReactFlowProvider>
                </Suspense>
              </Tabs.Panel>
            )}
          </Tabs>
        </AppShell.Main>
      </AppShell>

      <Spotlight />
    </>
  );
});
