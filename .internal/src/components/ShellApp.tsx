import "@gfazioli/mantine-split-pane/styles.css";
import "@mantine/core/styles.css";
import "@mantine/dropzone/styles.css";
import "@xyflow/react/dist/style.css";

import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import {
  getMapInitPromise,
  getPreviewInitPromise,
  getStoryInitPromise,
  getTilesetInitPromise,
} from "@/init/editorInit";
import { pathToTab, tabToPath } from "@/routes/tabs";
import { selectors as localeSelectors } from "@/slices/locale";
import { actions as uiActions } from "@/slices/ui";
import { store } from "@/store/store";
import { setActiveLocaleThunk, setUserLocaleThunk } from "@/thunks/locale";
import { SupportedLang, supportedLangs } from "@/types/i18n";
import { MainTabName } from "@/types/tab";
import { hasNewerEngineVersion } from "@/utils/version";
import { AppShell, Badge, Box, Group, Tabs, Text } from "@mantine/core";
import { Dropzone, FileWithPath } from "@mantine/dropzone";
import { useDisclosure } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconUpload, IconX } from "@tabler/icons-react";
import { ReactFlowProvider } from "@xyflow/react";
import {
  memo,
  ReactElement,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useTranslation } from "react-i18next";
import { shallowEqual } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import LocaleSelector from "./LocaleSelector";
import PanelLoader from "./PanelLoader";
import PreviewTab from "./Preview";
import Spotlight from "./Spotlight";
import DialogueTab from "./tabs/DialogueTab";
import MapEditorTab from "./tabs/MapEditor";
import StoryTab from "./tabs/StoryTab";
import TilesetEditorTab from "./tabs/TilesetEditor";
import UploadAssetModal from "./uploadAssets/UploadAssetModal";

// Get the cached init promises that persist across HMR
const tilesetInitPromise = getTilesetInitPromise();
const mapInitPromise = getMapInitPromise();
const storyInitPromise = getStoryInitPromise();
const previewInitPromise = getPreviewInitPromise();

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
  const { t } = useTranslation();
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
            title: t("updateAvailable"),
            centered: true,
            withCloseButton: true,
            innerProps: {
              makeItems: () => [
                {
                  ok: true,
                  message: t("editorWillUpdate"),
                },
                {
                  ok: true,
                  message: t("migrateAssetsAutomatically"),
                },
                {
                  ok: false,
                  message: t("migrateLevelCodeManually"),
                },
                {
                  ok: true,
                  message: t("upgradeReversible"),
                },
              ],
              confirmLabel: t("okUpgrade"),
              msg: t("updateEditorMsg"),
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
                    title: t("upgradeFailed"),
                    color: "red",
                    message: t("upgradeFailedMsg", { msg }),
                    autoClose: 3000,
                  });
                } else {
                  notifications.show({
                    title: t("upgradeSuccessful"),
                    color: "green",
                    message: t("upgradeSuccessMsg"),
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
  }, [t]);

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
      } else if (value === "dialogue-editor") {
        const state = store.getState();
        const dlgId = state.dialogue.activeDialogueId;
        if (dlgId) {
          canonical += `/${dlgId}`;
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
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
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

  const activeLocale = useAppSelector(localeSelectors.activeLocale);
  const userLocale = useAppSelector(localeSelectors.userLocale);

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

  const handleLevelLocaleChange = useCallback(
    (locale: SupportedLang) => {
      dispatch(setActiveLocaleThunk(locale));
    },
    [dispatch],
  );

  const handleUserLocaleChange = useCallback(
    (locale: SupportedLang) => {
      dispatch(setUserLocaleThunk(locale));
    },
    [dispatch],
  );

  const untranslatedCounts = useAppSelector(localeSelectors.untranslatedCounts);
  const untranslatedBadges: Map<SupportedLang, ReactElement> = useMemo(() => {
    return new Map(
      supportedLangs
        .filter((l) => (untranslatedCounts[l] ?? 0) > 0)
        .map((l) => {
          return [
            l,
            <Badge size="xs" color="orange" variant="filled">
              {untranslatedCounts[l]}
            </Badge>,
          ];
        }),
    );
  }, [untranslatedCounts]);

  return (
    <>
      {draggedFiles && (
        <UploadAssetModal
          files={draggedFiles}
          opened={assetTypeOpened}
          closeModal={closeAssetType}
        />
      )}

      <Dropzone.FullScreen
        onDrop={onDrop}
        multiple
        accept={{ "image/png": [".png"] }}
      >
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
              {t("dragAssetsHere")}
            </Text>
            <Text size="sm" c="dimmed" inline mt={7}>
              {t("attachAssetsMsg")}
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
              <Tabs.Tab value="map-editor">{t("mapTab")}</Tabs.Tab>
              <Tabs.Tab value="tileset-editor">{t("tilesetsTab")}</Tabs.Tab>
              <Tabs.Tab value="story-editor">{t("storyTab")}</Tabs.Tab>
              <Tabs.Tab value="dialogue-editor">{t("dialogueTab")}</Tabs.Tab>
              <Tabs.Tab value="preview">{t("previewTab")}</Tabs.Tab>
              <Box style={{ marginLeft: "auto" }} pr="sm">
                <Group gap={0}>
                  <LocaleSelector
                    key="your-lang"
                    label={t("yourLanguage")}
                    locale={userLocale}
                    hideMain
                    onLocaleChange={handleUserLocaleChange}
                  />
                  <LocaleSelector
                    key="level-lang"
                    label={t("levelLanguage")}
                    locale={activeLocale}
                    onLocaleChange={handleLevelLocaleChange}
                    rightSection={untranslatedBadges}
                  />
                </Group>
              </Box>
            </Tabs.List>

            <PanelLoader visible={isPendingTab} />

            {mountedTabs["preview"] && (
              <Tabs.Panel value="preview">
                <Suspense
                  fallback={<PanelLoader message={loadingMessages.at(-1)} />}
                >
                  <PreviewTab initPromise={previewInitPromise} />
                </Suspense>
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
