import "@gfazioli/mantine-split-pane/styles.css";
import "@mantine/core/styles.css";
import "@mantine/dropzone/styles.css";

import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { getMapInitPromise, getTilesetInitPromise } from "@/init/editorInit";
import { pathToTab, tabToPath } from "@/routes/tabs";
import { brokenTileGroups } from "@/selectors/map";
import { actions as uiActions } from "@/slices/ui";
import { store } from "@/store/store";
import { resetAllThunk, resetMapThunk } from "@/thunks/map";
import { MainTabName } from "@/types/tab";
import { AppShell, Group, Tabs, Text } from "@mantine/core";
import { Dropzone, FileWithPath } from "@mantine/dropzone";
import { useDisclosure } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { Spotlight, SpotlightActionData } from "@mantine/spotlight";
import {
  IconSearch,
  IconTrash,
  IconUnlink,
  IconUpload,
  IconX,
} from "@tabler/icons-react";
import { ReactFlowProvider } from "@xyflow/react";
import {
  Suspense,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { shallowEqual } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import DialogueTab from "./Dialogue";
import MapEditorTab from "./MapEditor";
import PanelLoader from "./PanelLoader";
import PreviewTab from "./Preview";
import StoryTab from "./StoryTab";
import TilesetEditorTab from "./TilesetEditor";
import UploadAssetModal from "./UploadAssetModal";
import { ItemStatus } from "./modals/ItemizedConfirmModal";

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

  // Sync tab changes with URL path
  useEffect(() => {
    const nextTab = pathToTab(pathname);
    if (nextTab !== activeTab) {
      dispatch(uiActions.clearLoadingMessages());
      dispatch(uiActions.setTab(nextTab));
      dispatch(uiActions.mountTab(nextTab));
    }
  }, [pathname, activeTab, dispatch]);

  // Handle tab changes by updating the URL path
  const handleTabChange = useCallback(
    (value: MainTabName | null) => {
      if (!value) return;
      const canonical = tabToPath(value);
      if (pathnameRef.current !== canonical) {
        navigate(canonical);
      }
    },
    [navigate]
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
  const dispatch = useAppDispatch();
  const [draggedFiles, setDraggedFiles] = useState<File[] | null>(null);
  const [assetTypeOpened, { open: openAssetType, close: closeAssetType }] =
    useDisclosure(false);

  const actions: SpotlightActionData[] = useMemo(
    () => [
      {
        id: "reset-map",
        label: "Reset map",
        description: "Delete all objects in the current map",
        onClick: () => {
          modals.openConfirmModal({
            title: "Reset map?",
            children: (
              <Text size="sm">
                This will delete everything in the map. This action cannot be
                undone.
              </Text>
            ),
            labels: { confirm: "Reset map", cancel: "Cancel" },
            confirmProps: { color: "red" },
            centered: true,
            withCloseButton: false,
            onConfirm: () => dispatch(resetMapThunk()),
          });
        },
        leftSection: <IconTrash />,
      },
      {
        id: "reset-all",
        label: "Reset all",
        description: "Delete all map, tileset, and story data",
        onClick: () => {
          modals.openConfirmModal({
            title: "Reset everything?",
            children: (
              <Text size="sm">
                This will delete everything. This action cannot be undone.
              </Text>
            ),
            labels: { confirm: "Reset ALL", cancel: "Cancel" },
            confirmProps: { color: "red" },
            centered: true,
            withCloseButton: false,
            onConfirm: () => dispatch(resetAllThunk()),
          });
        },
        leftSection: <IconTrash />,
      },
      {
        id: "clear-broken",
        label: "Clear broken objects",
        description:
          "Remove references to missing tilesets or objects from the map",
        onClick: () => {
          modals.openContextModal({
            modal: "confirm",
            title: "Clear broken references?",
            centered: true,
            withCloseButton: true,
            innerProps: {
              makeItems: () => {
                const items: ItemStatus[] = [];
                const state = store.getState();
                const broken = brokenTileGroups(state);
                items.push({
                  ok: broken.length === 0,
                  message:
                    broken.length === 0
                      ? "No broken tiles found."
                      : `Found ${broken.length} broken tiles`,
                });
                return items;
              },
              confirmLabel: "Yes, clear references",
              msg: "Are you sure you want to clear all broken references? This will delete all map objects that are not backed by a tileset. This action cannot be undone.",
              onConfirm: () => {},
            },
          });
        },
        leftSection: <IconUnlink />,
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
            onChange={(tab) => onTabChange(tab as MainTabName | null)}
          >
            <Tabs.List style={{ alignItems: "center" }}>
              <Tabs.Tab value="map-editor">Map</Tabs.Tab>
              <Tabs.Tab value="tileset-editor">Tilesets</Tabs.Tab>
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
});
