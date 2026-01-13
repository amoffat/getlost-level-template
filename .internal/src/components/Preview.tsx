import { useCommsContext } from "@/context/comms";
import { useAppSelector } from "@/hooks/redux";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Comms } from "@/iframe";
import { SavePathGraphRequest } from "@/iframe/request";
import { log } from "@/log";
import { Split } from "@gfazioli/mantine-split-pane";
import {
  Anchor,
  Button,
  Checkbox,
  Fieldset,
  Group,
  Select,
  Stack,
  Switch,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconDeviceDesktop,
  IconDeviceMobile,
  IconUpload,
} from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import LogPane from "./LogPane";
import { MarkdownModal } from "./MarkdownModal";

const GAME_URLS = {
  local: "http://localhost:5176",
  prod: "https://getlost.gg/",
  qa: "https://qa.getlost.gg/",
};

export default function PreviewTab() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { comms, setComms } = useCommsContext();
  const [reloadCount, setReloadCount] = useState(0);
  const activeTab = useAppSelector((state) => state.ui.activeTab);
  const [gameEnv, setGameEnv] = useLocalStorage<keyof typeof GAME_URLS>({
    key: "gl-game-env",
    defaultValue: "prod",
  });
  const [isDragging, setIsDragging] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(true);
  const [audioMode, setAudioMode] = useLocalStorage<"audio" | "muted">({
    key: "gl-audio-mode",
    defaultValue: "audio",
  });
  const [deviceType, setDeviceType] = useLocalStorage<"desktop" | "mobile">({
    key: "gl-device-type",
    defaultValue: "desktop",
  });
  const [enableOverlays, setEnableOverlays] = useLocalStorage<boolean>({
    key: "gl-overlays-enabled",
    defaultValue: false,
  });
  const [autoReload, setAutoReload] = useLocalStorage<boolean>({
    key: "gl-auto-reload",
    defaultValue: true,
  });
  const [pendingReload, setPendingReload] = useState(false);
  const [
    licenseModalOpened,
    { open: openLicenseModal, close: closeLicenseModal },
  ] = useDisclosure(false);
  const [licenseContent, setLicenseContent] = useState<Promise<string>>();
  const [
    storyGuidelinesModalOpened,
    { open: openStoryGuidelinesModal, close: closeStoryGuidelinesModal },
  ] = useDisclosure(false);
  const [storyGuidelinesContent, setStoryGuidelinesContent] =
    useState<Promise<string>>();
  const [publishChecks, setPublishChecks] = useState({
    licenseAgreed: false,
    guidelinesAgreed: false,
    assetsDisclosed: false,
  });
  const [isPublishing, setIsPublishing] = useState(false);

  // Respond to level reload requests from HMR (when level code or assets
  // change)
  useEffect(() => {
    if (import.meta.hot) {
      const fn = () => {
        if (!autoReload) {
          log.info("Auto-reload disabled, skipping reload");
          return;
        }
        if (activeTab !== "preview") {
          // Queue up the reload for when the tab becomes active
          setPendingReload(true);
          log.info(
            { dev: true, color: "yellow" },
            "Reload queued (tab inactive)"
          );
          return;
        }
        log.info({ dev: true, color: "green" }, "Reloading level");
        setReloadCount((c) => c + 1);
      };
      import.meta.hot.on("gl:level-reload", fn);

      return () => {
        import.meta.hot!.off("gl:level-reload", fn);
      };
    }
  }, [activeTab, autoReload]);

  // Process queued reload when tab becomes active
  useEffect(() => {
    if (activeTab === "preview" && pendingReload) {
      log.info({ dev: true, color: "green" }, "Processing queued reload");
      queueMicrotask(() => {
        setReloadCount((c) => c + 1);
        setPendingReload(false);
      });
    }
  }, [activeTab, pendingReload]);

  useEffect(() => {
    if (!comms) return;

    comms.addMessageListener<SavePathGraphRequest>({
      type: "save-path-graph",
      callback: async ({ graph }) => {
        await fetch("/api/pathgraph", {
          method: "POST",
          headers: { "Content-Type": "application/octet-stream" },
          body: graph,
        });
      },
    });
  }, [comms]);

  const loadIframe = () => {
    if (!iframeLoaded) {
      setIframeLoaded(true);
      setReloadCount((c) => c + 1);
    }
  };

  const stopIframe = () => {
    const iframe = iframeRef.current;
    if (iframe) {
      iframe.src = "about:blank";
      setIframeLoaded(false);
      setComms(null);
    }
  };

  const restartIframe = () => {
    setReloadCount((c) => c + 1);
  };

  useEffect(() => {
    if (!iframeLoaded) return;

    const iframe = iframeRef.current!;
    const levelUrl = window.location.origin;
    const targetUrl = GAME_URLS[gameEnv];
    const src = new URL(targetUrl);

    const qs = src.searchParams;
    qs.set("overlays", enableOverlays ? "1" : "0");
    qs.set("device", deviceType);

    // Copy all search params from parent frame to iframe src
    const parentParams = new URL(window.location.href).searchParams;
    for (const [key, value] of parentParams.entries()) {
      qs.set(key, value);
    }

    qs.set("levelBaseUrl", levelUrl);
    log.info(
      { qs: new Map(qs.entries()), dev: true },
      `Loading game from ${targetUrl}`
    );
    iframe.src = src.toString();

    const comms = new Comms({
      window,
      subWindows: [iframe.contentWindow!],
      role: "parent",
    });
    setComms(comms);
  }, [
    reloadCount,
    setComms,
    gameEnv,
    iframeLoaded,
    enableOverlays,
    deviceType,
  ]);

  // Send audio mode changes to iframe without reloading (skip on initial mount)
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (!comms || !iframeLoaded) return;

    comms.request({
      type: "set-audio-mode",
      data: { muted: audioMode === "muted" },
    });
  }, [audioMode, comms, iframeLoaded]);

  const publish = async () => {
    setIsPublishing(true);
    try {
      const response = await fetch("/api/git/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (response.ok) {
        notifications.show({
          title: "Published Successfully",
          message: `Level changes published to branch: ${result.branch}`,
          color: "green",
        });
      } else {
        notifications.show({
          title: "Publish Failed",
          message: result.error || "Failed to publish level changes",
          color: "red",
        });
      }
    } catch (error: any) {
      notifications.show({
        title: "Publish Error",
        message: error.message || "An error occurred while publishing",
        color: "red",
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const loadFile = async (path: string): Promise<string> => {
    const response = await fetch(`/files/${path}`);
    if (!response.ok) {
      notifications.show({
        title: "Error",
        message: `Failed to load file, please see ${path}`,
        color: "red",
      });
      throw new Error(`Failed to load file: ${response.statusText}`);
    }
    return await response.text();
  };

  const showLicenseAgreement = (e: React.MouseEvent) => {
    e.preventDefault();

    try {
      const content = loadFile("docs/License.md");
      setLicenseContent(content);
      openLicenseModal();
    } catch (e) {
      log.error(e);
    }
  };

  const showStoryGuidelines = (e: React.MouseEvent) => {
    e.preventDefault();

    try {
      const content = loadFile("docs/StoryGuidelines.md");
      setStoryGuidelinesContent(content);
      openStoryGuidelinesModal();
    } catch (e) {
      log.error(e);
    }
  };

  return (
    <>
      <Split h="100dvh" style={{ flex: 1 }}>
        {/* Left pane */}
        <Split.Pane
          initialWidth={300}
          minWidth={200}
          maxWidth={500}
          onResizeStart={() => setIsDragging(true)}
          onResizeEnd={() => setIsDragging(false)}
        >
          <Stack h="100%" style={{ overflow: "hidden" }}>
            <Stack p={0}>
              <Fieldset legend="Environment">
                <Stack p={0}>
                  <Select
                    data={[
                      { value: "local", label: "Localhost" },
                      { value: "prod", label: "Production" },
                      { value: "qa", label: "QA" },
                    ]}
                    value={gameEnv}
                    onChange={(value) =>
                      setGameEnv(value as keyof typeof GAME_URLS)
                    }
                    allowDeselect={false}
                    w={"100%"}
                  />

                  <Group gap="xs">
                    <Button
                      size="xs"
                      onClick={restartIframe}
                      disabled={!iframeLoaded}
                    >
                      Restart
                    </Button>
                    <Button
                      size="xs"
                      onClick={stopIframe}
                      disabled={!iframeLoaded}
                    >
                      Stop
                    </Button>
                    <Button
                      size="xs"
                      onClick={loadIframe}
                      disabled={iframeLoaded}
                    >
                      Start
                    </Button>
                  </Group>

                  <Switch
                    label="Auto-reload"
                    checked={autoReload}
                    onChange={(event) =>
                      setAutoReload(event.currentTarget.checked)
                    }
                  />

                  <Switch
                    label="Enable overlays"
                    checked={enableOverlays}
                    onChange={(event) =>
                      setEnableOverlays(event.currentTarget.checked)
                    }
                  />
                </Stack>
              </Fieldset>

              <Fieldset legend="Device">
                <Select
                  value={deviceType}
                  onChange={(value) =>
                    setDeviceType(value as "desktop" | "mobile")
                  }
                  allowDeselect={false}
                  leftSection={
                    deviceType === "mobile" ? (
                      <IconDeviceMobile size={16} />
                    ) : (
                      <IconDeviceDesktop size={16} />
                    )
                  }
                  data={[
                    { value: "desktop", label: "Desktop" },
                    { value: "mobile", label: "Mobile" },
                  ]}
                />
              </Fieldset>

              <Fieldset legend="Audio">
                <Switch
                  label="Enabled"
                  checked={audioMode === "audio"}
                  onChange={(event) =>
                    setAudioMode(
                      event.currentTarget.checked ? "audio" : "muted"
                    )
                  }
                />
              </Fieldset>

              <Fieldset legend="Publishing">
                <Stack p={0} gap="sm">
                  <Checkbox
                    checked={publishChecks.licenseAgreed}
                    onChange={(event) =>
                      setPublishChecks({
                        ...publishChecks,
                        licenseAgreed: event.currentTarget.checked,
                      })
                    }
                    label={
                      <>
                        I agree to the{" "}
                        <Anchor inherit onClick={showLicenseAgreement}>
                          Level Submission License Agreement
                        </Anchor>{" "}
                      </>
                    }
                  />
                  <Checkbox
                    checked={publishChecks.guidelinesAgreed}
                    onChange={(event) =>
                      setPublishChecks({
                        ...publishChecks,
                        guidelinesAgreed: event.currentTarget.checked,
                      })
                    }
                    label={
                      <>
                        My level adheres to the{" "}
                        <Anchor inherit onClick={showStoryGuidelines}>
                          Story Submission Guidelines
                        </Anchor>
                      </>
                    }
                  />
                  <Checkbox
                    checked={publishChecks.assetsDisclosed}
                    onChange={(event) =>
                      setPublishChecks({
                        ...publishChecks,
                        assetsDisclosed: event.currentTarget.checked,
                      })
                    }
                    label="I have disclosed all third-party assets in this level"
                  />

                  <Button
                    fullWidth
                    size="lg"
                    leftSection={<IconUpload size={20} />}
                    variant="gradient"
                    gradient={{ from: "blue", to: "red", deg: 90 }}
                    onClick={publish}
                    loading={isPublishing}
                    disabled={
                      !publishChecks.licenseAgreed ||
                      !publishChecks.guidelinesAgreed ||
                      !publishChecks.assetsDisclosed
                    }
                  >
                    Publish
                  </Button>
                </Stack>
              </Fieldset>
            </Stack>
          </Stack>
        </Split.Pane>

        <Split.Resizer />

        {/* Center panel with iframe and bottom pane */}
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
            {/* Top: iframe */}
            <Split.Pane
              grow
              minHeight={200}
              onResizeStart={() => setIsDragging(true)}
              onResizeEnd={() => setIsDragging(false)}
            >
              <div
                id="frame-container"
                style={{
                  width: "100%",
                  height: "100%",
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                <iframe
                  tabIndex={-1}
                  ref={iframeRef}
                  id="dev-frame"
                  allow="cross-origin-isolated"
                  allowFullScreen
                ></iframe>
                {/* Overlay to block pointer events on iframe during drag */}
                {isDragging && (
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      zIndex: 9999,
                      cursor: "row-resize",
                    }}
                  />
                )}
              </div>
            </Split.Pane>

            <Split.Resizer />

            {/* Bottom pane */}
            <Split.Pane
              initialHeight={300}
              minHeight={100}
              maxHeight={500}
              onResizeStart={() => setIsDragging(true)}
              onResizeEnd={() => setIsDragging(false)}
            >
              <div style={{ fontSize: "0.8em", height: "100%" }}>
                <LogPane maxMessages={200} />
              </div>
            </Split.Pane>
          </Split>
        </Split.Pane>
      </Split>
      {licenseContent && (
        <MarkdownModal
          title="Level Submission License Agreement"
          opened={licenseModalOpened}
          close={closeLicenseModal}
        >
          {licenseContent}
        </MarkdownModal>
      )}
      {storyGuidelinesContent && (
        <MarkdownModal
          title="Story Submission Guidelines"
          opened={storyGuidelinesModalOpened}
          close={closeStoryGuidelinesModal}
        >
          {storyGuidelinesContent}
        </MarkdownModal>
      )}
    </>
  );
}
