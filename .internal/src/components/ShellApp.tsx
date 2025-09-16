import { AppShell, Tabs } from "@mantine/core";
import { ReactFlowProvider } from "@xyflow/react";
import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { useAppSelector } from "../hooks/redux";
import { log } from "../log";
import { RootState } from "../store/store";
import DialogueTab from "./Dialogue";
import MapEditorTab from "./MapEditor";
import PreviewTab from "./Preview";
import TilesetEditorTab from "./TilesetEditor";

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

type TabName = "preview" | "map-editor" | "tileset-editor" | "dialogue-editor";
const defaultTab: TabName = "tileset-editor";

export function ShellApp() {
  // Track active tab and which tabs have been mounted at least once
  const [activeTab, setActiveTab] = useState<TabName>(defaultTab);
  const [mountedTabs, setMountedTabs] = useState<
    Partial<Record<TabName, boolean>>
  >({
    [defaultTab]: true,
  });
  const ts = useAppSelector((state: RootState) => state.tilesetEditor);
  const ms = useAppSelector((state: RootState) => state.mapEditor);
  const dispatch = useDispatch();

  const handleTabChange = (value: TabName | null) => {
    if (!value) return;
    setActiveTab(value);
    setMountedTabs((prev) => (prev[value] ? prev : { ...prev, [value]: true }));
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

  return (
    <AppShell withBorder={true}>
      <AppShell.Main>
        <Tabs
          value={activeTab}
          onChange={(tab) => handleTabChange(tab as TabName)}
        >
          <Tabs.List>
            <Tabs.Tab value="map-editor">Map</Tabs.Tab>
            <Tabs.Tab value="tileset-editor">Tilesets</Tabs.Tab>
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
  );
}
