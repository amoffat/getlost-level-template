import * as constants from "@/constants";
import { useCommsContext } from "@/context/comms";
import { useAppSelector } from "@/hooks/redux";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Comms } from "@/iframe";
import {
  DebugFlagKey,
  MilestonesSatisfiedMessage,
  SavePathGraphRequest,
} from "@/iframe/request";
import { log } from "@/log";
import { selectors as mapEditorSelectors } from "@/slices/mapEditor";
import { RootState } from "@/store/store";
import { Env } from "@/types/env";
import { encodeForUrl } from "@/utils/url";
import { Split } from "@gfazioli/mantine-split-pane";
import {
  Anchor,
  Button,
  Checkbox,
  Fieldset,
  Group,
  Select,
  Slider,
  Stack,
  Switch,
  Text,
  Textarea,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconDeviceDesktop,
  IconDeviceMobile,
  IconRocket,
} from "@tabler/icons-react";
import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import CardModal from "./CardModal";
import AdvancedSection from "./common/AdvancedSection";
import LogPane from "./LogPane";
import { MarkdownModal } from "./MarkdownModal";
import MilestoneList from "./MilestoneList";
import TimeDisplay from "./TimeDisplay";
import Tip from "./Tip";

export default function PreviewTab({
  initPromise,
}: {
  initPromise: Promise<unknown>;
}) {
  use(initPromise);

  const { t } = useTranslation();

  const { nodes } = useAppSelector((state: RootState) => state.story);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const frameContainerRef = useRef<HTMLDivElement>(null);
  const { comms, setComms } = useCommsContext();
  const card = useAppSelector(mapEditorSelectors.selectCard);
  const [reloadCount, setReloadCount] = useState(0);
  const activeTab = useAppSelector((state) => state.ui.activeTab);
  const [gameEnv, setGameEnv] = useLocalStorage<Env>({
    key: "gl-game-env",
    defaultValue: "prod",
  });
  const [isDragging, setIsDragging] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(true);
  const [audioMode, _setAudioMode] = useLocalStorage<"audio" | "muted">({
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
  const [debugFlags, setDebugFlags] = useLocalStorage<Record<string, boolean>>({
    key: "gl-debug-flags",
    defaultValue: {},
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
  const [cardModalOpened, { open: openCardModal, close: closeCardModal }] =
    useDisclosure(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);

  const publishForm = useForm({
    initialValues: {
      licenseAgreed: false,
      guidelinesAgreed: false,
      assetsDisclosed: false,
      commitMessage: "Updates",
    },
    validate: {
      licenseAgreed: (value) => (value ? null : t("previewLicenseRequired")),
      guidelinesAgreed: (value) =>
        value ? null : t("previewGuidelinesRequired"),
      assetsDisclosed: (value) => (value ? null : t("previewAssetsRequired")),
      commitMessage: (value) =>
        value.trim().length > 0 ? null : t("previewCommitMsgRequired"),
    },
  });

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
          if (!pendingReload) {
            // Queue up the reload for when the tab becomes active
            setPendingReload(true);
            log.info(
              { dev: true, color: "yellow" },
              "Reload queued (tab inactive)",
            );
          }
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
  }, [activeTab, autoReload, pendingReload]);

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

  const [milestoneIdsToNodeIds, nodeIdsToMilestoneIds] = useMemo(() => {
    const m2n = new Map<string, string>();
    const n2m = new Map<string, string>();
    for (const node of nodes) {
      if (node.type === "story") {
        m2n.set(node.data.id, node.id);
        n2m.set(node.id, node.data.id);
      }
    }
    return [m2n, n2m] as const;
  }, [nodes]);

  useEffect(() => {
    if (!comms) return;

    const cleanup = comms.addMessageListener<SavePathGraphRequest>({
      type: "save-path-graph",
      callback: async ({ graph }) => {
        await fetch("/api/pathgraph", {
          method: "POST",
          headers: { "Content-Type": "application/octet-stream" },
          body: graph,
        });
      },
    });

    return cleanup;
  }, [comms]);

  useEffect(() => {
    const cleanup = comms?.addMessageListener<MilestonesSatisfiedMessage>({
      type: "milestones-satisfied",
      callback: async ({ milestones }) => {
        const nodeIds = Object.entries(milestones)
          .filter(([_, satisfied]) => satisfied)
          .map(([mId, _]) => milestoneIdsToNodeIds.get(mId)!);
        setSelectedNodeIds(nodeIds);
      },
    });

    return cleanup;
  }, [comms, nodes, milestoneIdsToNodeIds]);

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

  const handleIframeLoad = () => {
    if (iframeRef.current?.src === "about:blank") return;
    setSelectedNodeIds([]);
  };

  useEffect(() => {
    if (!iframeLoaded) return;

    const iframe = iframeRef.current!;
    const levelUrl = window.location.origin;
    const targetUrl = constants.gameUrls[gameEnv];
    const src = new URL(targetUrl);

    const qs = src.searchParams;

    const frameRect = frameContainerRef.current!.getBoundingClientRect();
    const debugConfig = {
      overlays: enableOverlays,
      device: deviceType,
      flags: debugFlags,
      frameGeom: {
        width: frameRect.width,
        height: frameRect.height,
        x: 0,
        y: 0,
      },
    };
    qs.set("debug", encodeForUrl(debugConfig));

    // Copy all search params from parent frame to iframe src
    const parentParams = new URL(window.location.href).searchParams;
    for (const [key, value] of parentParams.entries()) {
      qs.set(key, value);
    }

    qs.set("levelBaseUrl", levelUrl);
    log.info(
      { qs: new Map(qs.entries()), dev: true },
      `Loading game from ${targetUrl}`,
    );
    iframe.src = src.toString();

    const comms = new Comms({
      window,
      subWindows: [iframe.contentWindow!],
      role: "parent",
    });
    setComms(comms);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const toggleDebug = (flag: DebugFlagKey, enabled: boolean) => {
    setDebugFlags((prev) => ({ ...prev, [flag]: enabled }));

    if (!comms || !iframeLoaded) return;

    comms.request({
      type: "debug-flag",
      data: { flag, value: enabled },
    });
  };

  const leftTips = useMemo(() => {
    const tips = [];
    if (!enableOverlays) {
      tips.push(t("previewNoAudioTip"));
    }
    return tips;
  }, [enableOverlays, t]);

  const createDebugSwitch = (
    label: string,
    key: DebugFlagKey,
  ): React.ReactNode => {
    return (
      <Switch
        label={label}
        defaultChecked={debugFlags[key] || false}
        onChange={(event) => toggleDebug(key, event.currentTarget.checked)}
      />
    );
  };

  const publish = async () => {
    if (!publishForm.validate().hasErrors) {
      setIsPublishing(true);
      try {
        const response = await fetch("/api/git/publish", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: publishForm.values.commitMessage,
          }),
        });

        const result = await response.json();

        if (response.ok) {
          notifications.show({
            title: t("previewPublishedSuccessTitle"),
            message: t("previewPublishedSuccessMsg", { branch: result.branch }),
            color: "green",
          });
        } else {
          notifications.show({
            title: t("previewPublishFailedTitle"),
            message: result.error || t("previewPublishFailedMsg"),
            color: "red",
          });
        }
      } catch (error: any) {
        notifications.show({
          title: t("previewPublishErrorTitle"),
          message: error.message || t("previewPublishErrorMsg"),
          color: "red",
        });
      } finally {
        setIsPublishing(false);
      }
    }
  };

  const loadFile = async (path: string): Promise<string> => {
    const response = await fetch(`/files/${path}`);
    if (!response.ok) {
      notifications.show({
        title: t("previewLoadFileErrorTitle"),
        message: t("previewLoadFileErrorMsg", { path }),
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

  const handleGameSpeedChange = useCallback(
    (value: number) => {
      const speedValues = [0.25, 0.5, 1, 2, 5, 10];
      const speed = speedValues[value];
      comms?.request({
        type: "set-game-speed",
        data: { speed },
      });
    },
    [comms],
  );

  const setGameFrameGeom = useCallback(() => {
    if (!comms) return;

    const container = frameContainerRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      comms.request({
        type: "set-window-geom",
        data: {
          width: rect.width,
          height: rect.height,
          x: 0,
          y: 0,
        },
      });
    }
  }, [comms]);

  useEffect(() => {
    window.addEventListener("resize", setGameFrameGeom);
    return () => {
      window.removeEventListener("resize", setGameFrameGeom);
    };
  }, [setGameFrameGeom]);

  const handlePaneResizeStart = () => {
    setIsDragging(true);
  };

  const handlePaneResizeEnd = () => {
    // Trigger redrawLayout when panels are resized
    // Use a small delay to ensure the DOM has updated
    requestAnimationFrame(() => {
      window.dispatchEvent(new Event("resize"));
    });
    setIsDragging(false);
  };

  const handleMilestoneSelect = useCallback(
    (nodeIds: string[]) => {
      setSelectedNodeIds(nodeIds);

      const selectedNodeIds = new Set(nodeIds);
      const allNodeIds = nodes.map((n) => n.id);
      const milestoneValues: Record<string, boolean> = {};
      for (const id of allNodeIds) {
        const mId = nodeIdsToMilestoneIds.get(id)!;
        milestoneValues[mId] = selectedNodeIds.has(id);
      }

      comms?.request({
        type: "satisfy-milestones",
        data: { milestones: milestoneValues },
      });
    },
    [comms, nodeIdsToMilestoneIds, nodes],
  );

  return (
    <>
      <Split h="100dvh" style={{ flex: 1 }}>
        {/* Left pane */}
        <Split.Pane
          initialWidth={350}
          minWidth={200}
          maxWidth={500}
          onResizeStart={handlePaneResizeStart}
          onResizeEnd={handlePaneResizeEnd}
        >
          <Stack h="100%" style={{ overflow: "hidden" }}>
            <Tip tips={leftTips} />
            <Fieldset legend={t("previewEngineFieldset")} p="xs">
              <Stack p={0}>
                <Select
                  label={t("previewEnvironmentLabel")}
                  data={[
                    { value: "local", label: t("previewEnvLocalhost") },
                    { value: "prod", label: t("previewEnvProduction") },
                    { value: "qa", label: t("previewEnvQA") },
                  ]}
                  defaultValue={gameEnv}
                  onChange={(value) => setGameEnv(value as Env)}
                  allowDeselect={false}
                  w={"100%"}
                />

                <Group gap="xs">
                  <Button
                    size="xs"
                    onClick={restartIframe}
                    disabled={!iframeLoaded}
                  >
                    {t("previewRestartBtn")}
                  </Button>
                  <Button
                    size="xs"
                    onClick={stopIframe}
                    disabled={!iframeLoaded}
                  >
                    {t("previewStopBtn")}
                  </Button>
                  <Button
                    size="xs"
                    onClick={loadIframe}
                    disabled={iframeLoaded}
                  >
                    {t("previewStartBtn")}
                  </Button>
                </Group>

                <Switch
                  label={t("previewAutoReloadLabel")}
                  defaultChecked={autoReload}
                  onChange={(event) =>
                    setAutoReload(event.currentTarget.checked)
                  }
                />

                <Switch
                  label={t("previewEnableOverlaysLabel")}
                  defaultChecked={enableOverlays}
                  onChange={(event) =>
                    setEnableOverlays(event.currentTarget.checked)
                  }
                />
              </Stack>
            </Fieldset>

            <Fieldset legend={t("previewDeviceEmulationFieldset")} p="xs">
              <Select
                defaultValue={deviceType}
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
                  { value: "desktop", label: t("previewDeviceDesktop") },
                  { value: "mobile", label: t("previewDeviceMobile") },
                ]}
              />
            </Fieldset>

            {/* <Fieldset legend="Audio">
                <Switch
                  label="Enabled"
                  checked={audioMode === "audio"}
                  onChange={(event) =>
                    setAudioMode(
                      event.currentTarget.checked ? "audio" : "muted"
                    )
                  }
                />
              </Fieldset> */}

            <Fieldset legend={t("previewPublishFieldset")} p="xs">
              <Stack p={0} gap="sm">
                <Checkbox
                  {...publishForm.getInputProps("licenseAgreed", {
                    type: "checkbox",
                  })}
                  label={
                    <>
                      {t("previewAgreeToThe")}{" "}
                      <Anchor inherit onClick={showLicenseAgreement}>
                        {t("previewLicenseAgreement")}
                      </Anchor>{" "}
                    </>
                  }
                />
                <Checkbox
                  {...publishForm.getInputProps("guidelinesAgreed", {
                    type: "checkbox",
                  })}
                  label={
                    <>
                      {t("previewLevelFollows")}{" "}
                      <Anchor inherit onClick={showStoryGuidelines}>
                        {t("previewStoryGuidelines")}
                      </Anchor>
                    </>
                  }
                />
                <Checkbox
                  {...publishForm.getInputProps("assetsDisclosed", {
                    type: "checkbox",
                  })}
                  label={t("previewThirdPartyAssetsLabel")}
                />
                <Checkbox
                  checked={card !== null}
                  disabled={card === null}
                  onChange={() => {}}
                  label={
                    <>
                      {t("previewIHaveSetThe")}{" "}
                      <Anchor
                        inherit
                        onClick={(e) => {
                          e.preventDefault();
                          openCardModal();
                        }}
                      >
                        {t("previewLevelCreditsLink")}
                      </Anchor>
                    </>
                  }
                />

                <Textarea
                  label={t("previewPublishMessageLabel")}
                  autosize
                  minRows={1}
                  maxRows={3}
                  required
                  {...publishForm.getInputProps("commitMessage")}
                />

                <Button
                  fullWidth
                  size="lg"
                  leftSection={<IconRocket size={20} />}
                  variant="gradient"
                  gradient={{ from: "blue", to: "red", deg: 90 }}
                  onClick={publish}
                  loading={isPublishing}
                  disabled={
                    !publishForm.values.licenseAgreed ||
                    !publishForm.values.guidelinesAgreed ||
                    !publishForm.values.assetsDisclosed
                  }
                >
                  {t("previewPublishLevelBtn")}
                </Button>
              </Stack>
            </Fieldset>
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
              onResizeStart={handlePaneResizeStart}
              onResizeEnd={handlePaneResizeEnd}
            >
              <div
                id="frame-container"
                ref={frameContainerRef}
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
                  onLoad={handleIframeLoad}
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
              initialHeight={275}
              minHeight={100}
              maxHeight={500}
              onResizeStart={handlePaneResizeStart}
              onResizeEnd={handlePaneResizeEnd}
            >
              <div style={{ fontSize: "0.8em", height: "100%" }}>
                <LogPane maxMessages={200} />
              </div>
            </Split.Pane>
          </Split>
        </Split.Pane>

        <Split.Resizer />

        {/* Right toolbar - tools and options */}
        <Split.Pane
          initialWidth={350}
          minWidth={200}
          maxWidth={500}
          onResizeStart={handlePaneResizeStart}
          onResizeEnd={handlePaneResizeEnd}
        >
          <Stack h="100%" style={{ overflow: "hidden" }}>
            <Stack gap="xs" p={0}>
              <MilestoneList
                legend={t("previewStoryProgressLegend")}
                selectedNodeIds={selectedNodeIds}
                onSelect={handleMilestoneSelect}
              />
            </Stack>

            <Fieldset legend={t("previewTimeControlFieldset")}>
              <Stack gap="xs" p={0} mb="lg">
                <Text size="sm" fw={500}>
                  {t("previewGameSpeedLabel")}
                </Text>
                <Slider
                  mb="lg"
                  label={null}
                  defaultValue={2}
                  min={0}
                  max={5}
                  step={1}
                  marks={[
                    { value: 0, label: "0.25x" },
                    { value: 1, label: "0.5x" },
                    { value: 2, label: "1x" },
                    { value: 3, label: "2x" },
                    { value: 4, label: "5x" },
                    { value: 5, label: "10x" },
                  ]}
                  onChangeEnd={handleGameSpeedChange}
                />
              </Stack>

              <TimeDisplay comms={comms} />
            </Fieldset>

            <Fieldset legend={t("previewVisualizationFieldset")}>
              <Stack gap="sm" p={0}>
                {createDebugSwitch(t("previewShowCollisions"), "collisions")}
                {createDebugSwitch(t("previewShowPathfinding"), "pathfinding")}
                {createDebugSwitch(t("previewShowSceneDepth"), "zSorting")}
                {createDebugSwitch(t("previewShowObjDetails"), "objDetails")}
              </Stack>
            </Fieldset>

            <AdvancedSection>
              <Fieldset legend={t("previewDeveloperToolsFieldset")}>
                <Stack gap="xs" p={0}>
                  <Anchor href="/level/main.js" target="_blank" size="xs">
                    {t("previewOpenCompiledLevelJs")}
                  </Anchor>
                </Stack>
              </Fieldset>
            </AdvancedSection>
          </Stack>
        </Split.Pane>
      </Split>
      {licenseContent && (
        <MarkdownModal
          title={t("previewLicenseAgreement")}
          opened={licenseModalOpened}
          close={closeLicenseModal}
        >
          {licenseContent}
        </MarkdownModal>
      )}
      {storyGuidelinesContent && (
        <MarkdownModal
          title={t("previewStoryGuidelines")}
          opened={storyGuidelinesModalOpened}
          close={closeStoryGuidelinesModal}
        >
          {storyGuidelinesContent}
        </MarkdownModal>
      )}
      <CardModal opened={cardModalOpened} onClose={closeCardModal} />
    </>
  );
}
