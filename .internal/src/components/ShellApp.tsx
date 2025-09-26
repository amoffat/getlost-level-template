import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { actions as uiActions } from "@/slices/ui";
import { loadTilesetsThunk } from "@/thunks/tileset";
import { TabName } from "@/types/tab";
import { AppShell, Group, Tabs, Text } from "@mantine/core";
import "@mantine/core/styles.css";
import { Dropzone, FileWithPath } from "@mantine/dropzone";
import "@mantine/dropzone/styles.css";
import { useDisclosure } from "@mantine/hooks";
import { IconUpload, IconX } from "@tabler/icons-react";
import { ReactFlowProvider } from "@xyflow/react";
import { useCallback, useEffect, useState } from "react";
import { log } from "../log";
import DialogueTab from "./Dialogue";
import MapEditorTab from "./MapEditor";
import NpcEditorTab from "./NpcEditor";
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

export function ShellApp() {
  const dispatch = useAppDispatch();
  const [draggedFiles, setDraggedFiles] = useState<File[] | null>(null);
  const [assetTypeOpened, { open: openAssetType, close: closeAssetType }] =
    useDisclosure(false);
  const { activeTab, mountedTabs } = useAppSelector((state) => state.ui);

  useEffect(() => {
    (async () => {
      try {
        await dispatch(loadTilesetsThunk()).unwrap();
      } catch (e) {
        log.error({ e }, "Failed to load tilesets:");
      }
    })();
  }, [dispatch]);

  const handleTabChange = (value: TabName | null) => {
    if (!value) return;

    dispatch(uiActions.setTab(value));
    dispatch(uiActions.mountTab(value));
  };
  // useEffect(() => {
  //   if (!comms) return;

  //   window.gl = {
  //     markers: {
  //       record: (slug: string) => {
  //         log.info({ dev: true }, `Recording marker '${slug}'`);
  //         comms.request({
  //           type: "record-marker",
  //           data: { slug },
  //         });
  //       },
  //       clear: (slug: string) => {
  //         log.info({ dev: true }, `Clearing marker '${slug}'`);
  //         comms.request({
  //           type: "clear-marker",
  //           data: { slug: slug ?? null },
  //         });
  //       },
  //     },
  //     nav: {
  //       clearCache: async () => {
  //         log.info({ dev: true }, `Clearing navigation cache`);
  //         await fetch("/api/pathgraph", {
  //           method: "DELETE",
  //         });
  //         setReloadCount((c) => c + 1);
  //       },
  //     },
  //   };
  // }, [comms]);

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

  return (
    <>
      {draggedFiles && (
        <UploadAssetModal
          files={draggedFiles}
          opened={assetTypeOpened}
          closeModal={closeAssetType}
        />
      )}
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
                <MapEditorTab />
              </Tabs.Panel>
            )}

            {mountedTabs["tileset-editor"] && (
              <Tabs.Panel value="tileset-editor">
                <TilesetEditorTab />
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
    </>
  );
}
