// @refresh reset
import { defaultMilestone, playerParticipantId } from "@/constants";
import { recordTransaction, useUndoRedo } from "@/history";
import { shallowEqual, useAppDispatch, useAppSelector } from "@/hooks/redux";
import { useParticipantList } from "@/hooks/useParticipant";
import {
  createDialogue,
  actions as dActions,
  selectors as dSelectors,
} from "@/slices/dialogue";
import { selectors as localeSelectors } from "@/slices/locale";
import { store } from "@/store/store";
import {
  reflowDialogueThunk,
  setDefaultDialogueThunk,
} from "@/thunks/dialogue";
import type { Dialogue, DNode } from "@/types/dialogue";
import { createUrlPath, participantsOf } from "@/utils/dialogue";
import { showNotification } from "@/utils/notifications";
import { Split } from "@gfazioli/mantine-split-pane";
import {
  Alert,
  Box,
  Button,
  Fieldset,
  Flex,
  Group,
  Menu,
  MultiSelect,
  Overlay,
  ScrollArea,
  Select,
  Stack,
  Switch,
  Text,
} from "@mantine/core";
import { useDebouncedCallback } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import {
  IconBubbleText,
  IconInfoCircle,
  IconPlus,
  IconSitemap,
  IconTrash,
} from "@tabler/icons-react";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  Controls,
  Edge,
  OnBeforeDelete,
  OnConnect,
  OnConnectEnd,
  OnDelete,
  OnEdgesChange,
  OnNodesChange,
  Panel,
  ReactFlow,
  SelectionMode,
  useOnSelectionChange,
  useReactFlow,
} from "@xyflow/react";
import {
  ChangeEvent,
  ReactNode,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import InfoTooltip from "../common/InfoTooltip";
import { DialogueListItem } from "../dialogue/DialogueListItem";
import { ParticipantAvatar } from "../dialogue/Participant";
import DialogueNode from "../flowNodes/DialogueNode";
import { ItemStatus } from "../modals/ItemizedConfirmModal";
import PanelLoader from "../PanelLoader";
import SpeechEditor from "../SpeechEditor";
import Tip from "../Tip";

import "@/styles/react-flow.css";

const nodeTypes = {
  dialogue: DialogueNode,
  sign: DialogueNode,
};

export default function DialogueTab({
  initPromise,
}: {
  initPromise: Promise<unknown>;
}) {
  use(initPromise);

  const reactFlowInstance = useReactFlow<DNode, Edge>();
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const { dlgid: dlgId, nodeid: nodeIdParam } = useParams<{
    dlgid?: string;
    nodeid?: string;
  }>();
  const location = useLocation();
  const availableMilestones = useAppSelector(dSelectors.availableMilestones);
  const allDialogues = useAppSelector(dSelectors.allDialogues);
  const storyNodes = useAppSelector((state) => state.story.nodes);
  const {
    activeMilestones,
    activeExactMilestoneOnly,
    activeNodes,
    activeEdges,
  } = useAppSelector(
    (state) => ({
      activeMilestones: dSelectors.activeMilestones(state),
      activeExactMilestoneOnly: dSelectors.activeExactMilestoneOnly(state),
      activeNodes: dSelectors.activeNodes(state),
      activeEdges: dSelectors.activeEdges(state),
    }),
    shallowEqual,
  );
  const activeDialogueId = useAppSelector(
    (state) => state.dialogue.activeDialogueId,
  );
  const currentLocale = useAppSelector(localeSelectors.activeLocale);
  const navigate = useNavigate();
  // Track the currently selected node for the right-pane editor
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
    nodeIdParam ?? null,
  );
  // Track which dialogue has already had its initial URL-node centering done, so
  // that subsequent user-driven selections don't re-center the viewport.
  const initialCenterDialogueRef = useRef<string | null>(null);

  // Left-pane filters (both clearable → null means "all").
  const [msFilter, setMsFilter] = useState<string | null>(null);
  const [participantFilter, setParticipantFilter] = useState<string | null>(
    null,
  );

  // Player + every talkable character; doubles as the participant filter options
  // and the "new dialogue" subject menu.
  const participantOptions = useParticipantList();

  // Load the active dialogue's graph into ReactFlow when the URL dialogue
  // changes. Selection is driven separately by the node-id effect below.
  useEffect(() => {
    if (!dlgId) {
      // Only clear if we're still on the dialogue page
      const samePage = location.pathname.startsWith("/dialogues");
      if (samePage) {
        dispatch(dActions.setActiveDialogue(null));
      }

      reactFlowInstance.setNodes([]);
      reactFlowInstance.setEdges([]);
      return;
    }

    const state = store.getState();
    const activeDialogue = dSelectors.selectDialogue(state, dlgId);
    if (!activeDialogue) {
      navigate("/dialogues");
      return;
    }

    // Load our nodes and edges into react flow. Strip `selected` so that the
    // URL param effect (below) is the sole source of truth for selection.
    const newNodes = (
      Object.values(activeDialogue.nodes.entities) as DNode[]
    ).map((n) => ({ ...n, selected: false }));
    reactFlowInstance.setNodes(newNodes);

    const newEdges = activeDialogue.edges.ids.map(
      (id) => activeDialogue.edges.entities[id] as Edge,
    );
    reactFlowInstance.setEdges(newEdges);

    if (dlgId !== state.dialogue.activeDialogueId) {
      dispatch(dActions.setActiveDialogue(dlgId));
      if (!nodeIdParam) {
        requestAnimationFrame(() => {
          reactFlowInstance.fitView({ padding: 0.25 });
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dlgId, dispatch, navigate]);

  // Sync node selection from URL parameter. Depends on activeDialogueId so
  // that it runs after the effect above has loaded the nodes into ReactFlow.
  useEffect(() => {
    if (!nodeIdParam || !activeDialogueId) {
      if (!nodeIdParam) {
        queueMicrotask(() => setSelectedNodeId(null));
      }
      return;
    }
    const nodes = reactFlowInstance.getNodes();
    if (!nodes.some((n) => n.id === nodeIdParam)) return;
    reactFlowInstance.setNodes(
      nodes.map((n) => ({ ...n, selected: n.id === nodeIdParam })),
    );
    if (initialCenterDialogueRef.current !== activeDialogueId) {
      initialCenterDialogueRef.current = activeDialogueId;
      requestAnimationFrame(() => {
        reactFlowInstance.fitView({
          nodes: [{ id: nodeIdParam }],
          padding: 0.5,
          maxZoom: 1,
        });
      });
    }
    queueMicrotask(() => setSelectedNodeId(nodeIdParam));

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeIdParam, activeDialogueId, setSelectedNodeId]);

  const { screenToFlowPosition } = useReactFlow();
  const flowContainerRef = useRef<HTMLDivElement>(null);
  const [isPendingDialogue, startDialogueTransition] = useTransition();

  const selectedNode = useAppSelector((state) =>
    selectedNodeId ? dSelectors.selectNode(state, selectedNodeId) : null,
  );

  useOnSelectionChange({
    onChange: ({ nodes: selectedNodes }) => {
      if (selectedNodes.length === 1) {
        const nodeId = selectedNodes[0].id;
        setSelectedNodeId(nodeId);
        if (dlgId) {
          navigate(createUrlPath({ id: dlgId, nodeId }), {
            replace: true,
          });
        }
      } else {
        setSelectedNodeId(null);
        if (dlgId) {
          navigate(createUrlPath({ id: dlgId }), {
            replace: true,
          });
        }
      }
    },
  });

  const onNodesChange = useDebouncedCallback(
    (changes: Parameters<OnNodesChange<DNode>>[0]) => {
      if (!dlgId) return;
      const nodes = reactFlowInstance.getNodes();
      dispatch(
        dActions.setNodes({
          dialogueId: dlgId,
          nodes: applyNodeChanges(changes, nodes),
        }),
      );
    },
    200,
  );

  // Prevent deletion of the origin node; clean up locale entries for deleted nodes
  const onBeforeDelete: OnBeforeDelete<DNode, Edge> = useCallback(
    async ({
      nodes: nodesToDelete,
    }: {
      nodes: DNode[];
      edges: Edge[];
    }): Promise<boolean> => {
      // ReactFlow node state can be stale (e.g. data.contentKey, data.choices
      // are updated via updateNodeData which only writes to Redux). Map each
      // ReactFlow node to its authoritative Redux counterpart before acting.
      const authoritativeNodes = nodesToDelete
        .map((n) => activeNodes[n.id])
        .filter((n): n is DNode => n !== undefined);

      const hasOrigin = authoritativeNodes.some((n) => n.data.isOrigin);
      if (hasOrigin) {
        showNotification({
          title: t("dialogueTabCannotDelete"),
          message: t("dialogueTabCannotDeleteMsg"),
          color: "orange",
        });
        return false;
      }

      return true;
    },
    [activeNodes, t],
  );

  const onEdgesChange = useDebouncedCallback(
    (changes: Parameters<OnEdgesChange>[0]) => {
      if (!dlgId) return;
      const edges = reactFlowInstance.getEdges();
      dispatch(
        dActions.setEdges({
          dialogueId: dlgId,
          edges: applyEdgeChanges(changes, edges),
        }),
      );
    },
    200,
  );

  // Record an undoable transaction for node deletions only (edge-only deletions
  // are ignored), scoped to the active dialogue. We capture just the deleted
  // node(s) so undo re-adds them into the *current* graph additively.
  const onDelete: OnDelete<DNode, Edge> = useCallback(
    ({ nodes: deleted }) => {
      if (deleted.length === 0 || !dlgId) return;

      // At onDelete, Redux is still pre-delete (the delete's setNodes is
      // debounced), so prefer the authoritative Redux node for its data; take
      // the current position from the ReactFlow node.
      const dlg = dSelectors.selectDialogue(store.getState(), dlgId);
      const nodes = deleted.map((rf) => {
        const authoritative = (dlg?.nodes.entities[rf.id] as DNode) ?? rf;
        return { ...authoritative, position: rf.position, selected: false };
      });

      dispatch(
        recordTransaction(`dialogue:${dlgId}`, {
          label: "Delete node",
          undo: nodes.map((node) =>
            dActions.addNode({ dialogueId: dlgId, node }),
          ),
          redo: nodes.map((node) =>
            dActions.removeNode({ dialogueId: dlgId, nodeId: node.id }),
          ),
        }),
      );
    },
    [dispatch, dlgId],
  );

  // After an undo/redo, reconcile the uncontrolled canvas to match Redux by node
  // identity only: keep existing canvas nodes (preserving live positions), add
  // nodes that reappeared in Redux, drop nodes that are gone. Edges untouched.
  const applyHistory = useCallback(() => {
    if (!dlgId) return;
    const dlg = dSelectors.selectDialogue(store.getState(), dlgId);
    if (!dlg) return;
    const reduxNodes = Object.values(dlg.nodes.entities) as DNode[];
    reactFlowInstance.setNodes((canvasNodes) => {
      const byId = new Map(canvasNodes.map((n) => [n.id, n]));
      return reduxNodes.map((rn) => byId.get(rn.id) ?? rn);
    });
  }, [reactFlowInstance, dlgId]);

  useUndoRedo(dlgId ? `dialogue:${dlgId}` : "dialogue:none", applyHistory);

  const onConnect: OnConnect = useCallback(
    (connection) => {
      if (!dlgId) return;
      const state = store.getState();
      const activeDialogue = dSelectors.selectDialogue(state, dlgId);
      if (!activeDialogue) return;

      const edges = reactFlowInstance.getEdges();
      dispatch(
        dActions.setEdges({
          dialogueId: activeDialogue.id,
          edges: addEdge(connection, edges),
        }),
      );
    },
    [dispatch, dlgId, reactFlowInstance],
  );

  const createSpeech = useCallback(
    ({
      dialogueId,
      clear = false,
      position,
      connectTo,
      speakerId: overrideSpeakerId,
      listenerId: overrideListenerId,
    }: {
      dialogueId: string | undefined;
      clear?: boolean;
      position?: { x: number; y: number } | undefined;
      connectTo?: {
        nodeId: string;
        handleId: string | null | undefined;
      };
      speakerId?: string | null;
      listenerId?: string | null;
    }) => {
      if (!dialogueId) return;

      if (!position) {
        const rect = flowContainerRef.current!.getBoundingClientRect();
        const centerScreen = {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        };
        position = screenToFlowPosition(centerScreen);
      }

      const dlg = dSelectors.selectDialogue(store.getState(), dialogueId)!;

      const id = crypto.randomUUID();
      const newNode: DNode = {
        id,
        position,
        selected: true,
        type: "dialogue",
        data: {
          id,
          speakerNameKey: undefined,
          contentKey: undefined,
          animated: true,
          choices: [],
          isOrigin: clear,
          // New nodes default to the dialogue's subject speaking to the player,
          // unless explicit overrides are provided (e.g. from a drag connection).
          speakerId:
            overrideSpeakerId !== undefined
              ? overrideSpeakerId
              : dlg.initiatingChar,
          listenerId:
            overrideListenerId !== undefined
              ? overrideListenerId
              : playerParticipantId,
        },
      };

      // Deselect all existing nodes and add the new node as selected
      const existingNodes = clear ? [] : reactFlowInstance.getNodes();
      const updatedNodes: DNode[] = [
        ...existingNodes.map((n) => ({ ...n, selected: false })),
        { ...newNode, selected: true },
      ];

      reactFlowInstance.setNodes(updatedNodes);
      dispatch(
        dActions.setNodes({
          dialogueId,
          nodes: updatedNodes,
        }),
      );

      // Optionally connect the new node to an existing one
      if (connectTo) {
        const source = connectTo.nodeId;
        const target = id;

        const newEdge: Edge = {
          id: crypto.randomUUID(),
          source,
          target,
          sourceHandle: connectTo.handleId,
        };

        const updatedEdges = [...reactFlowInstance.getEdges(), newEdge];
        reactFlowInstance.setEdges(updatedEdges);
        dispatch(
          dActions.setEdges({
            dialogueId,
            edges: updatedEdges,
          }),
        );
      }

      setSelectedNodeId(id);
    },
    [dispatch, screenToFlowPosition, reactFlowInstance],
  );

  const onConnectEnd: OnConnectEnd = useCallback(
    (event, connectionState) => {
      if (!dlgId || connectionState.isValid) return;

      const { clientX, clientY } =
        "changedTouches" in event ? event.changedTouches[0] : event;

      if (connectionState.fromHandle?.position === "right") {
        const sourceNodeId = connectionState.fromNode!.id;
        const connectTo = {
          nodeId: sourceNodeId,
          handleId: connectionState.fromHandle?.id,
        };

        const state = store.getState();
        const sourceNode = dSelectors.selectNode(state, sourceNodeId);
        let speakerId: string | null | undefined;
        let listenerId: string | null | undefined;

        if (sourceNode && sourceNode.data.listenerId !== playerParticipantId) {
          // Swap speaker and listener so the response flows back naturally
          speakerId = sourceNode.data.listenerId;
          listenerId = sourceNode.data.speakerId;
        }

        createSpeech({
          dialogueId: dlgId,
          position: screenToFlowPosition({ x: clientX, y: clientY }),
          connectTo,
          speakerId,
          listenerId,
        });
      }
    },
    [dlgId, createSpeech, screenToFlowPosition],
  );

  // Create a new dialogue owned by `subjectId` (a character or the player, for
  // internal monologue), seed its origin speech, and open it.
  const handleNewDialogue = useCallback(
    (initiatingChar: string) => {
      const state = store.getState();
      const hasDefault = dSelectors
        .dialoguesForObj(state, initiatingChar)
        .some((d) => d.milestoneNodeIds.includes(defaultMilestone));
      const dId = crypto.randomUUID();
      const milestones = hasDefault ? [] : [defaultMilestone];

      // Build the origin speech node and persist it straight to the *new*
      // dialogue in Redux. We deliberately avoid createSpeech here: that helper
      // mutates the live ReactFlow canvas, which still belongs to the currently
      // open dialogue. Clearing it emits node-removal changes that the debounced
      // onNodesChange would write back onto the previously open dialogue,
      // wiping its nodes. Writing directly to Redux leaves existing dialogues
      // untouched; the load effect repopulates the canvas after we navigate.
      const nodeId = crypto.randomUUID();
      const originNode: DNode = {
        id: nodeId,
        position: { x: 0, y: 0 },
        selected: true,
        type: "dialogue",
        data: {
          id: nodeId,
          speakerNameKey: undefined,
          contentKey: undefined,
          animated: true,
          choices: [],
          isOrigin: true,
          speakerId: initiatingChar,
          listenerId: playerParticipantId,
        },
      };

      dispatch(
        dActions.addDialogue(
          createDialogue({
            id: dId,
            initiatingChar,
            milestoneNodeIds: milestones,
          }),
        ),
      );
      dispatch(dActions.setNodes({ dialogueId: dId, nodes: [originNode] }));
      navigate(createUrlPath({ id: dId }));
    },
    [dispatch, navigate],
  );

  // Open a dialogue from the list.
  const openDialogue = useCallback(
    (dlg: Dialogue) => {
      startDialogueTransition(() => {
        navigate(createUrlPath({ id: dlg.id }));
      });
    },
    [navigate],
  );

  const handlePaneResize = () => {
    // Trigger redrawLayout when panels are resized
    // Use a small delay to ensure the DOM has updated
    requestAnimationFrame(() => {
      window.dispatchEvent(new Event("resize"));
    });
  };

  // Participant id → display name, milestone id → name, and the set of
  // milestones actually used by some dialogue (for the filter dropdown).
  const { idToName, milestoneOptions } = useMemo(() => {
    const idToName = new Map(participantOptions.map((o) => [o.value, o.label]));
    const msIdToName = new Map(
      storyNodes.map((n) => [n.id, n.data.id] as [string, string]),
    );
    const used = new Set<string>();
    for (const dlg of allDialogues) {
      for (const m of dlg.milestoneNodeIds) used.add(m);
    }
    const milestoneOptions = [...used].map((m) => ({
      value: m,
      label: msIdToName.get(m) ?? m,
    }));
    return { idToName, milestoneOptions };
  }, [participantOptions, storyNodes, allDialogues]);

  // The filtered, sorted dialogue list shown in the left pane.
  const filteredDialogues = useMemo(() => {
    return allDialogues
      .filter((dlg) => {
        if (msFilter && !dlg.milestoneNodeIds.includes(msFilter)) return false;
        if (participantFilter && !participantsOf(dlg).has(participantFilter)) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        const an =
          idToName.get(a.initiatingChar ?? "") ?? a.initiatingChar ?? "";
        const bn =
          idToName.get(b.initiatingChar ?? "") ?? b.initiatingChar ?? "";
        return an.localeCompare(bn) || a.id.localeCompare(b.id);
      });
  }, [allDialogues, msFilter, participantFilter, idToName]);

  const onMilestoneChange = useCallback(
    (milestones: string[]) => {
      if (!dlgId) return;

      dispatch(
        dActions.setMilestones({
          dialogueId: dlgId,
          milestoneNodeIds: milestones,
        }),
      );

      const existing = new Set(activeMilestones);
      const current = new Set(milestones);
      const defaultAdded =
        !existing.has(defaultMilestone) && current.has(defaultMilestone);

      // If "default" was just added, remove it from all sibling dialogues
      if (defaultAdded) {
        dispatch(setDefaultDialogueThunk(dlgId));
      }
    },
    [dlgId, activeMilestones, dispatch],
  );

  const onExactMilestoneOnlyChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (!dlgId) return;

      dispatch(
        dActions.setExactMilestoneOnly({
          dialogueId: dlgId,
          exactMilestoneOnly: e.currentTarget.checked,
        }),
      );
    },
    [dlgId, dispatch],
  );

  // Delete the active dialogue entirely. Per-milestone removal is handled by the
  // milestones MultiSelect in the right panel.
  const handleDeleteActiveDialogue = useCallback(() => {
    if (!dlgId) return;

    modals.openContextModal({
      modal: "confirm",
      title: t("dialogueTabDeleteTitle"),
      centered: true,
      withCloseButton: true,
      innerProps: {
        makeItems: (): ItemStatus[] => [
          { ok: false, message: t("dialogueTabDeleteItem4") },
        ],
        confirmLabel: t("dialogueTabDeleteConfirm"),
        msg: t("dialogueTabDeleteMsg"),
        onConfirm: () => {
          dispatch(dActions.removeDialogue(dlgId));
          navigate("/dialogues");
        },
      },
    });
  }, [dlgId, dispatch, navigate, t]);

  const handleReflow = useCallback(async () => {
    if (!dlgId) return;
    const resp = await dispatch(reflowDialogueThunk(dlgId)).unwrap();

    if (!resp) return;
    const { nodes: laidOutNodes, edges: laidOutEdges } = resp;

    reactFlowInstance.setNodes(laidOutNodes);
    reactFlowInstance.setEdges(laidOutEdges);
    requestAnimationFrame(() => {
      reactFlowInstance.fitView({ duration: 250, padding: 0.25 });
    });
  }, [dispatch, reactFlowInstance, dlgId]);

  const tips: ReactNode[] = useMemo(() => {
    const tipItems: ReactNode[] = [];

    if (Object.values(activeNodes).length === 1) {
      tipItems.push(t("dialogueTabTip1"));
      tipItems.push(t("dialogueTabTip2"));
    }

    if (!dlgId && participantOptions.length > 1) {
      tipItems.push(t("dialogueTabTip3"));
    }

    return tipItems;
  }, [activeNodes, dlgId, participantOptions.length, t]);

  return (
    <Split h="100dvh" style={{ flex: 1 }}>
      {/* Left panel — flat dialogue list with filters */}
      <Split.Pane
        initialWidth="18%"
        minWidth={260}
        maxWidth="45%"
        onResizeEnd={handlePaneResize}
      >
        <Stack h="100%" style={{ overflow: "hidden" }} gap="xs" p="xs">
          <Group justify="space-between" wrap="nowrap">
            <Text fw={600} fz="sm">
              {t("dialogueTab")}
            </Text>
            <Menu position="bottom-end" withinPortal>
              <Menu.Target>
                <Button
                  size="xs"
                  variant="light"
                  leftSection={<IconPlus size={16} />}
                >
                  {t("dialogueTabNewDialogue")}
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>{t("dialogueTabNewDialogueFor")}</Menu.Label>
                {participantOptions.map((o) => (
                  <Menu.Item
                    key={o.value}
                    onClick={() => handleNewDialogue(o.value)}
                    leftSection={
                      <Box
                        w={20}
                        h={20}
                        style={{ overflow: "hidden", flexShrink: 0 }}
                      >
                        <ParticipantAvatar
                          participantId={o.value}
                          size={20}
                          scale={1}
                        />
                      </Box>
                    }
                  >
                    {o.label}
                  </Menu.Item>
                ))}
              </Menu.Dropdown>
            </Menu>
          </Group>

          <Select
            clearable
            searchable
            placeholder={t("dialogueTabAllMilestones")}
            data={milestoneOptions}
            value={msFilter}
            onChange={setMsFilter}
          />
          <Select
            clearable
            searchable
            placeholder={t("dialogueTabAllParticipants")}
            data={participantOptions}
            value={participantFilter}
            onChange={setParticipantFilter}
          />

          <ScrollArea type="never" style={{ flex: 1 }}>
            <Stack gap={4} pb="xl" p={0}>
              {filteredDialogues.length === 0 ? (
                <Alert
                  variant="light"
                  icon={<IconInfoCircle />}
                  title={
                    allDialogues.length === 0
                      ? t("dialogueTabNoDialoguesYet")
                      : t("dialogueTabNoMatches")
                  }
                >
                  {allDialogues.length === 0
                    ? t("dialogueTabNoDialoguesYetMsg")
                    : null}
                </Alert>
              ) : (
                filteredDialogues.map((dlg) => (
                  <DialogueListItem
                    key={dlg.id}
                    dialogue={dlg}
                    active={dlg.id === dlgId}
                    onOpen={openDialogue}
                  />
                ))
              )}
            </Stack>
          </ScrollArea>
        </Stack>
      </Split.Pane>

      <Split.Resizer />

      {/* Center panel - ReactFlow */}
      <Split.Pane grow>
        <Flex
          style={{ height: "100%", position: "relative" }}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div ref={flowContainerRef} style={{ flex: 1, width: "100%" }}>
            <ReactFlow
              id="dialogue-flow"
              colorMode="dark"
              //   snapToGrid={true}
              nodeTypes={nodeTypes}
              snapGrid={[20, 20]}
              panOnDrag={[2]}
              deleteKeyCode={["Delete", "Backspace"]}
              multiSelectionKeyCode={null}
              defaultNodes={Object.values(activeNodes)}
              defaultEdges={Object.values(activeEdges)}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onConnectEnd={onConnectEnd}
              onBeforeDelete={onBeforeDelete}
              onDelete={onDelete}
              selectionOnDrag={false}
              selectionMode={SelectionMode.Partial}
              fitView
            >
              <Background color="#505050ff" variant={BackgroundVariant.Dots} />
              <Controls position="top-left" showInteractive={false}></Controls>
              <Panel position="top-center">
                <Group gap="xs">
                  <Button
                    variant="filled"
                    onClick={() => createSpeech({ dialogueId: dlgId })}
                    leftSection={<IconBubbleText size={20} />}
                  >
                    {t("dialogueTabNewSpeech")}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleReflow}
                    leftSection={<IconSitemap size={20} />}
                  >
                    {t("dialogueTabOrganize")}
                  </Button>
                  {dlgId && (
                    <Button
                      variant="filled"
                      color="red"
                      onClick={handleDeleteActiveDialogue}
                      leftSection={<IconTrash size={20} />}
                    >
                      {t("dialogueTabDeleteDialogue")}
                    </Button>
                  )}
                </Group>
              </Panel>
            </ReactFlow>
          </div>

          <PanelLoader visible={isPendingDialogue} />

          {!dlgId && !isPendingDialogue && (
            <Overlay color="#000" backgroundOpacity={0.65} blur={4} zIndex={10}>
              <Stack align="center" justify="center" style={{ height: "100%" }}>
                <Text size="lg" c="dimmed">
                  {t("dialogueTabSelectPrompt")}
                </Text>
              </Stack>
            </Overlay>
          )}
        </Flex>
      </Split.Pane>

      <Split.Resizer />

      {/* Right panel */}
      <Split.Pane
        initialWidth="20%"
        minWidth={250}
        maxWidth="45%"
        onResizeEnd={handlePaneResize}
      >
        <Stack h="100%" style={{ overflow: "hidden" }} pb="xl">
          <Tip tips={tips} />

          <ScrollArea type="never" style={{ flex: 1 }}>
            <Stack p={0} gap="md" pb="xl">
              {dlgId && (
                <>
                  <Fieldset legend={t("dialogueTabDialogueLegend")} p="xs">
                    <Stack p={0}>
                      <MultiSelect
                        required
                        label={
                          <>
                            {t("dialogueTabMilestonesLabel")}
                            <InfoTooltip>
                              <Text style={{ whiteSpace: "pre-line" }}>
                                {t("dialogueTabMilestonesTooltip")}
                              </Text>
                            </InfoTooltip>
                          </>
                        }
                        description={t("dialogueTabMilestonesDesc")}
                        searchable
                        value={activeMilestones}
                        onChange={onMilestoneChange}
                        data={availableMilestones}
                        nothingFoundMessage={t("dialogueTabNoMilestonesFound")}
                        disabled={!dlgId}
                      />

                      <Switch
                        label={
                          <>
                            {t("dialogueTabExactMilestoneOnlyLabel")}
                            <InfoTooltip>
                              <Text style={{ whiteSpace: "pre-line" }}>
                                {t("dialogueTabExactMilestoneOnlyTooltip")}
                              </Text>
                            </InfoTooltip>
                          </>
                        }
                        description={t("dialogueTabExactMilestoneOnlyDesc")}
                        checked={activeExactMilestoneOnly}
                        onChange={onExactMilestoneOnlyChange}
                        disabled={!dlgId}
                      />
                    </Stack>
                  </Fieldset>

                  {selectedNodeId && selectedNode && (
                    <SpeechEditor
                      key={selectedNodeId}
                      currentLocale={currentLocale}
                      node={selectedNode}
                    />
                  )}
                </>
              )}
            </Stack>
          </ScrollArea>
        </Stack>
      </Split.Pane>
    </Split>
  );
}
