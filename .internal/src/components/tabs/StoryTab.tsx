// @refresh reset
import { storyOriginNodeId } from "@/constants";
import { AncestorHighlightContext } from "@/contexts/AncestorHighlightContext";
import { WaypointModalContext } from "@/contexts/WaypointModalContext";
import { recordTransaction, useUndoRedo } from "@/history";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import {
  addNode,
  JunctionNode,
  MilestoneWaypoint,
  removeNode,
  setEdges,
  setNodeData,
  setNodes,
  StoryEdge,
  StoryNode,
} from "@/slices/story";
import type { RootState } from "@/store/store";
import { store } from "@/store/store";
import { reflowStoryThunk } from "@/thunks/story";
import { showNotification } from "@/utils/notifications";
import { Split } from "@gfazioli/mantine-split-pane";
import { Button, Flex, ScrollArea, Stack } from "@mantine/core";
import { useDebouncedCallback, useDisclosure } from "@mantine/hooks";
import {
  IconLogicOr,
  IconScriptPlus,
  IconSitemap,
  IconStarFilled,
} from "@tabler/icons-react";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  Controls,
  getOutgoers,
  IsValidConnection,
  Node,
  OnConnect,
  OnEdgesChange,
  OnNodeDrag,
  OnNodesChange,
  OnNodesDelete,
  Panel,
  ReactFlow,
  SelectionMode,
  useOnSelectionChange,
  useReactFlow,
  type DefaultEdgeOptions,
  type Edge,
  type OnBeforeDelete,
  type OnConnectEnd,
  type OnDelete,
} from "@xyflow/react";
import {
  ReactNode,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import StoryEdgeComponent from "../flowEdges/StoryEdge";
import OrNode from "../flowNodes/OrNode";
import StoryNodeComponent from "../flowNodes/StoryNode";
import MilestoneEditor from "../MilestoneEditor";
import MilestoneList from "../MilestoneList";
import Tip from "../Tip";
import WaypointLinkModal from "../WaypointLinkModal";

import "@/styles/react-flow.css";

const nodeTypes = { story: StoryNodeComponent, or: OrNode };
const edgeTypes = { default: StoryEdgeComponent };

export default function StoryTab({
  initPromise,
}: {
  initPromise: Promise<unknown>;
}) {
  use(initPromise);

  const { t } = useTranslation();
  const { nodeid: nodeIdParam } = useParams<{ nodeid?: string }>();
  const navigate = useNavigate();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
    nodeIdParam ?? null,
  );
  const [newlyCreatedNodeId, setNewlyCreatedNodeId] = useState<string | null>(
    null,
  );
  const dispatch = useAppDispatch();

  // Waypoint modal — single shared instance for the whole tab
  const [
    waypointModalOpen,
    { open: openWaypointModalDisc, close: closeWaypointModal },
  ] = useDisclosure(false);
  const [waypointModalNodeId, setWaypointModalNodeId] = useState<string | null>(
    null,
  );
  const [editingWaypoint, setEditingWaypoint] =
    useState<MilestoneWaypoint | null>(null);

  const openWaypointModal = useCallback(
    (nodeId: string, waypoint: MilestoneWaypoint | null) => {
      setWaypointModalNodeId(nodeId);
      setEditingWaypoint(waypoint);
      openWaypointModalDisc();
    },
    [openWaypointModalDisc],
  );

  const waypointModalNode = useAppSelector((state: RootState) =>
    waypointModalNodeId
      ? state.story.nodes.find((n) => n.id === waypointModalNodeId)
      : undefined,
  );

  const onSaveWaypoint = useCallback(
    (wp: MilestoneWaypoint) => {
      if (!waypointModalNodeId) return;
      const existing = waypointModalNode?.data.waypoints ?? [];
      const updated = editingWaypoint
        ? existing.map((w) =>
            w.characterId === editingWaypoint.characterId ? wp : w,
          )
        : [...existing, wp];
      dispatch(
        setNodeData({ id: waypointModalNodeId, data: { waypoints: updated } }),
      );
    },
    [dispatch, waypointModalNodeId, waypointModalNode, editingWaypoint],
  );

  const { nodes, edges, instanceKey } = useAppSelector(
    (state: RootState) => state.story,
  );
  const flowContainerRef = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useReactFlow<StoryNode, StoryEdge>();
  const { screenToFlowPosition, getNodes, getEdges } = reactFlowInstance;
  const overlappedEdgeRef = useRef<string | null>(null);
  const pendingBridgingEdgesRef = useRef<StoryEdge[]>([]);

  // Compute bridging edges before deletion while the graph is still intact.
  // We'll use these edges later to "bridge" any gaps in the graph left by the
  // deleted nodes, so the user doesn't have to manually reconnect everything
  // that was connected to the deleted node(s).
  const onBeforeDelete: OnBeforeDelete<StoryNode, StoryEdge> = useCallback(
    async ({ nodes: nodesToDelete }) => {
      // Prevent deletion of the undeletable origin node.
      const hasOrigin = nodesToDelete.some((n) => n.id === storyOriginNodeId);
      if (hasOrigin) {
        showNotification({
          title: t("storyTabCannotDeleteOrigin"),
          message: t("storyTabCannotDeleteOriginMsg"),
          color: "orange",
        });
        return false;
      }

      const currentEdges = reactFlowInstance.getEdges();
      const removedIds = new Set(nodesToDelete.map((n) => n.id));

      const bridgingEdges: StoryEdge[] = [];
      for (const node of nodesToDelete) {
        const incoming = currentEdges.filter(
          (e) => e.target === node.id && !removedIds.has(e.source),
        );
        const outgoing = currentEdges.filter(
          (e) => e.source === node.id && !removedIds.has(e.target),
        );
        for (const inEdge of incoming) {
          for (const outEdge of outgoing) {
            if (
              currentEdges.some(
                (e) =>
                  e.source === inEdge.source && e.target === outEdge.target,
              ) ||
              bridgingEdges.some(
                (e) =>
                  e.source === inEdge.source && e.target === outEdge.target,
              )
            )
              continue;
            bridgingEdges.push({
              id: crypto.randomUUID(),
              source: inEdge.source,
              target: outEdge.target,
            });
          }
        }
      }

      pendingBridgingEdgesRef.current = bridgingEdges;
      return true;
    },
    [reactFlowInstance, t],
  );

  // After deletion completes, inject the bridging edges
  const onNodesDelete: OnNodesDelete<StoryNode> = useCallback(() => {
    const bridging = pendingBridgingEdgesRef.current;
    pendingBridgingEdgesRef.current = [];
    if (bridging.length === 0) return;

    const currentEdges = reactFlowInstance.getEdges();
    const updatedEdges = [...currentEdges, ...bridging];
    reactFlowInstance.setEdges(updatedEdges);
    dispatch(setEdges(updatedEdges));
  }, [reactFlowInstance, dispatch]);

  const onNodesChange = useDebouncedCallback(
    (changes: Parameters<OnNodesChange<StoryNode>>[0]) => {
      const currentNodes = reactFlowInstance.getNodes();
      const updatedNodes = applyNodeChanges(changes, currentNodes);
      dispatch(setNodes(updatedNodes));
    },
    500,
  );
  const onEdgesChange: OnEdgesChange = useDebouncedCallback((changes) => {
    const currentEdges = reactFlowInstance.getEdges();
    dispatch(setEdges(applyEdgeChanges(changes, currentEdges)));
  }, 500);

  // Record an undoable transaction for node deletions only. Edge-only deletions
  // are ignored. We capture just the deleted node(s) so undo re-adds them into
  // the *current* graph (additively) rather than restoring a stale snapshot.
  const onDelete: OnDelete<StoryNode, StoryEdge> = useCallback(
    ({ nodes: deleted }) => {
      if (deleted.length === 0) return;

      // At onDelete, Redux is still pre-delete (the delete's setNodes is
      // debounced), so prefer the authoritative Redux node for its data; take
      // the current position from the ReactFlow node.
      const reduxNodes = store.getState().story.nodes;
      const nodes = deleted.map((rf) => {
        const authoritative = reduxNodes.find((n) => n.id === rf.id) ?? rf;
        return { ...authoritative, position: rf.position, selected: false };
      });

      dispatch(
        recordTransaction("story", {
          label: "Delete node",
          undo: nodes.map((n) => addNode(n)),
          redo: nodes.map((n) => removeNode(n.id)),
        }),
      );
    },
    [dispatch],
  );

  // After an undo/redo, reconcile the uncontrolled canvas to match Redux by node
  // identity only: keep existing canvas nodes (preserving live positions), add
  // nodes that reappeared in Redux, drop nodes that are gone. Edges untouched.
  const applyHistory = useCallback(() => {
    const reduxNodes = store.getState().story.nodes;
    reactFlowInstance.setNodes((canvasNodes) => {
      const byId = new Map(canvasNodes.map((n) => [n.id, n]));
      return reduxNodes.map((rn) => byId.get(rn.id) ?? rn);
    });
  }, [reactFlowInstance]);

  useUndoRedo("story", applyHistory);
  const onConnect: OnConnect = useCallback(
    (connection) => {
      dispatch(setEdges(addEdge(connection, reactFlowInstance.getEdges())));
    },
    [dispatch, reactFlowInstance],
  );

  const isValidConnection: IsValidConnection<Edge> = useCallback(
    (connection): boolean => {
      // we are using getNodes and getEdges helpers here
      // to make sure we create isValidConnection function only once
      const nodes = getNodes();
      const edges = getEdges();
      const target = nodes.find((node) => node.id === connection.target)!;

      const hasCycle = (node: StoryNode, visited = new Set()) => {
        if (visited.has(node.id)) return false;

        visited.add(node.id);

        for (const outgoer of getOutgoers(node, nodes, edges)) {
          if (outgoer.id === connection.source) return true;
          if (hasCycle(outgoer, visited)) return true;
        }
      };

      let isValid: boolean;
      if (target.id === connection.source) {
        isValid = false;
      } else {
        isValid = !hasCycle(target);
      }
      if (!isValid) {
        showNotification({
          key: "story-connection-cycle",
          title: t("storyTabInvalidConnection"),
          message: t("storyTabInvalidConnectionMsg"),
          color: "red",
          autoClose: 5000,
        });
      }
      return isValid;
    },
    [getNodes, getEdges, t],
  );

  const createMilestone = useCallback(
    ({
      position,
      connectTo,
    }: {
      position?: { x: number; y: number };
      connectTo?: {
        nodeId: string;
        handlePosition: string | null | undefined;
      };
    } = {}) => {
      if (!position) {
        const rect = flowContainerRef.current?.getBoundingClientRect();
        const centerScreen = rect
          ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
          : { x: 0, y: 0 };
        position = screenToFlowPosition(centerScreen);
      }

      const newNodeId = crypto.randomUUID();
      const currentNodes = reactFlowInstance.getNodes();
      const newNode: StoryNode = {
        id: newNodeId,
        position,
        type: "story",
        selected: true,
        data: {
          id: newNodeId,
          npcs: [],
        },
      };

      const updatedNodes: StoryNode[] = [
        ...currentNodes.map((n) => ({ ...n, selected: false })),
        newNode,
      ];

      reactFlowInstance.setNodes(updatedNodes);
      dispatch(setNodes(updatedNodes));

      // Optionally connect the new node to an existing one
      if (connectTo) {
        // If connecting from bottom handle, existing node → new node
        // If connecting from top handle, new node → existing node
        const isFromBottom = connectTo.handlePosition === "bottom";
        const source = isFromBottom ? connectTo.nodeId : newNodeId;
        const target = isFromBottom ? newNodeId : connectTo.nodeId;

        const newEdge: StoryEdge = {
          id: crypto.randomUUID(),
          source,
          target,
          data: {
            negated: false,
          },
        };

        const updatedEdges = [...reactFlowInstance.getEdges(), newEdge];
        reactFlowInstance.setEdges(updatedEdges);
        dispatch(setEdges(updatedEdges));
      }

      setSelectedNodeId(newNodeId);
      setNewlyCreatedNodeId(newNodeId);
    },
    [dispatch, reactFlowInstance, screenToFlowPosition],
  );

  const createJunction = useCallback(
    (kind: "or") => {
      const rect = flowContainerRef.current?.getBoundingClientRect();
      const centerScreen = rect
        ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
        : { x: 0, y: 0 };
      const position = screenToFlowPosition(centerScreen);

      const newNodeId = crypto.randomUUID();
      const currentNodes = reactFlowInstance.getNodes();
      const newNode: JunctionNode = {
        id: newNodeId,
        position,
        type: kind,
        selected: true,
        data: {
          id: newNodeId,
          kind,
        },
      };

      const updatedNodes: Node<any>[] = [
        ...currentNodes.map((n) => ({ ...n, selected: false })),
        newNode,
      ];

      reactFlowInstance.setNodes(updatedNodes);
      dispatch(setNodes(updatedNodes));
      setSelectedNodeId(newNodeId);
    },
    [dispatch, reactFlowInstance, screenToFlowPosition],
  );

  const defaultEdgeOptions: DefaultEdgeOptions = {
    interactionWidth: 75,
  };

  const onNodeDrag: OnNodeDrag = useCallback(
    (_e, node) => {
      const nodeDiv = document.querySelector(
        `.react-flow__node[data-id="${node.id}"]`,
      );
      if (!nodeDiv) return;

      // Find all edges near the center of the node and highlight the first one
      // we find, prioritizing any edge that would be replaced by this drag
      const rect = nodeDiv.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const edgeFound = document
        .elementsFromPoint(centerX, centerY)
        .find((el) => el.classList.contains("react-flow__edge-interaction"))
        ?.closest("[data-id]") as HTMLElement | null | undefined;

      const edgeId = edgeFound?.dataset.id;

      if (edgeId) {
        reactFlowInstance.updateEdge(edgeId, { style: { stroke: "#a0c4ff" } });
      } else if (overlappedEdgeRef.current) {
        reactFlowInstance.updateEdge(overlappedEdgeRef.current, { style: {} });
      }

      overlappedEdgeRef.current = edgeId || null;
    },
    [reactFlowInstance],
  );

  const onNodeDragStop: OnNodeDrag = useCallback(
    (_event, node) => {
      const edgeId = overlappedEdgeRef.current;
      overlappedEdgeRef.current = null;
      if (!edgeId) return;

      // Always reset the highlighted stroke first, before any early exit,
      // so a stale highlight can never persist if the edge is missing or
      // onNodeDrag fails to revert it for any other reason.
      reactFlowInstance.updateEdge(edgeId, { style: {} });

      const edge = reactFlowInstance.getEdge(edgeId);
      if (!edge) return;

      // Capture original endpoints before any mutation
      const originalSource = edge.source;
      const originalTarget = edge.target;

      const newId = crypto.randomUUID();

      // Build the full updated edge list atomically:
      // - Replace the existing edge: originalSource → node
      // - Add a new edge:            node → originalTarget
      const updatedEdges = reactFlowInstance
        .getEdges()
        .map((e) =>
          e.id === edgeId
            ? { ...e, source: originalSource, target: node.id, style: {} }
            : e,
        )
        .concat({
          id: newId,
          source: node.id,
          target: originalTarget,
        });

      reactFlowInstance.setEdges(updatedEdges);
      dispatch(setEdges(updatedEdges));
    },
    [reactFlowInstance, dispatch],
  );

  const onConnectEnd: OnConnectEnd = useCallback(
    (event, connectionState) => {
      if (connectionState.isValid) return;

      const { clientX, clientY } =
        "changedTouches" in event ? event.changedTouches[0] : event;

      createMilestone({
        position: screenToFlowPosition({ x: clientX, y: clientY }),
        connectTo: {
          nodeId: connectionState.fromNode!.id,
          handlePosition: connectionState.fromHandle?.position,
        },
      });
    },
    [createMilestone, screenToFlowPosition],
  );

  // Sync node selection from URL parameter on first load.
  useEffect(() => {
    if (!nodeIdParam) {
      return;
    }
    const currentNodes = reactFlowInstance.getNodes();
    if (!currentNodes.some((n) => n.id === nodeIdParam)) return;
    reactFlowInstance.setNodes(
      currentNodes.map((n) => ({ ...n, selected: n.id === nodeIdParam })),
    );
    requestAnimationFrame(() => {
      reactFlowInstance.fitView({
        nodes: [{ id: nodeIdParam }],
        padding: 0.5,
        maxZoom: 1,
      });
    });
    // Don't depend on nodeIdParam, so that this only runs once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useOnSelectionChange({
    onChange: ({ nodes: selectedNodes }) => {
      if (selectedNodes.length === 1) {
        const id = selectedNodes[0].id;
        setSelectedNodeId(id);
        // Clear newly-created tracking when user manually selects a different node
        setNewlyCreatedNodeId((prev) => (prev === id ? prev : null));
        navigate(`/story/nodes/${id}`, { replace: true });
      } else {
        setSelectedNodeId(null);
        setNewlyCreatedNodeId(null);
        navigate("/story", { replace: true });
      }
    },
  });

  // Compute ancestor nodes and edges for the selected node via BFS
  const ancestorHighlight = useMemo(() => {
    const nodeIds = new Set<string>();
    const edgeIds = new Set<string>();
    if (!selectedNodeId) return { nodeIds, edgeIds };

    const nodeQueue = [selectedNodeId];
    const visited = new Set<string>([selectedNodeId]);
    while (nodeQueue.length > 0) {
      const currentNode = nodeQueue.shift()!;
      for (const edge of edges) {
        if (edge.target === currentNode) {
          visited.add(edge.source);
          nodeIds.add(edge.source);
          edgeIds.add(edge.id);
          nodeQueue.push(edge.source);
        }
      }
    }
    return { nodeIds, edgeIds };
  }, [selectedNodeId, edges]);

  const milestoneListCheckboxState = useMemo<Record<string, boolean>>(
    () => (selectedNodeId ? { [selectedNodeId]: true } : {}),
    [selectedNodeId],
  );

  const handleMilestoneSelect = useCallback(
    (state: Record<string, boolean>) => {
      const selectedNodeIds = Object.entries(state)
        .filter(([, checked]) => checked)
        .map(([id]) => id);
      const currentNodes = reactFlowInstance.getNodes();
      const selectedSet = new Set(selectedNodeIds);
      const updatedNodes = currentNodes.map((n) => ({
        ...n,
        selected: selectedSet.has(n.id),
      }));
      reactFlowInstance.setNodes(updatedNodes);
      // setSelectedNodeId is also updated via useOnSelectionChange,
      // but set it immediately so ancestorHighlight reacts without delay.
      setSelectedNodeId(
        selectedNodeIds.length === 1 ? selectedNodeIds[0] : null,
      );
    },
    [reactFlowInstance],
  );

  const handleReflow = useCallback(async () => {
    const resp = await dispatch(reflowStoryThunk()).unwrap();
    if (!resp) return;
    const { nodes: laidOutNodes, edges: laidOutEdges } = resp;
    reactFlowInstance.setNodes(laidOutNodes);
    reactFlowInstance.setEdges(laidOutEdges);
    requestAnimationFrame(() => {
      reactFlowInstance.fitView({ duration: 250, padding: 0.2 });
    });
  }, [dispatch, reactFlowInstance]);

  const handlePaneResize = () => {
    // Trigger redrawLayout when panels are resized
    // Use a small delay to ensure the DOM has updated
    requestAnimationFrame(() => {
      window.dispatchEvent(new Event("resize"));
    });
  };

  const isStoryNode = useMemo(() => {
    const selectedNode = nodes.find((n) => n.id === selectedNodeId);
    return selectedNode?.type === "story";
  }, [nodes, selectedNodeId]);

  // The origin node always exists, so treat "only origin node present" the same
  // as empty for UX purposes (milestone list, tips).
  const hasUserNodes = nodes.some((n) => n.id !== storyOriginNodeId);

  const showMilestoneEditor = selectedNodeId && isStoryNode;
  const showDependencyMilestones = nodes.length > 0;

  const rightTips: ReactNode[] = useMemo(() => {
    const tips = [];

    if (!hasUserNodes) {
      tips.push(t("storyTabTip1"));
    } else {
      tips.push(t("storyTabTip2"));
      tips.push(t("storyTabTip3"));
      tips.push(t("storyTabTip4"));
    }

    if (hasUserNodes && edges.length > 0) {
      tips.push(t("storyTabTip5"));
      tips.push(t("storyTabTip6"));
    }

    return tips;
  }, [hasUserNodes, edges, t]);

  return (
    <WaypointModalContext.Provider value={{ openWaypointModal }}>
      <Split h="100dvh" style={{ flex: 1 }}>
        {/* Left panel */}
        <Split.Pane
          initialWidth={300}
          minWidth={200}
          maxWidth={500}
          onResizeEnd={handlePaneResize}
        >
          <Stack h="100%" style={{ overflow: "hidden" }} pb="xl">
            <ScrollArea type="never" style={{ flex: 1 }}>
              {showDependencyMilestones && (
                <Stack p={0} pb="xl">
                  <MilestoneList
                    checkboxState={milestoneListCheckboxState}
                    ancestorHighlight={ancestorHighlight.nodeIds}
                    onChange={handleMilestoneSelect}
                    selectedIcon={IconStarFilled}
                  />
                </Stack>
              )}
            </ScrollArea>
          </Stack>
        </Split.Pane>

        <Split.Resizer />

        {/* Center panel - ReactFlow */}
        <Split.Pane grow>
          <Flex
            style={{ height: "100%" }}
            onContextMenu={(e) => e.preventDefault()}
          >
            <div ref={flowContainerRef} style={{ flex: 1, width: "100%" }}>
              <AncestorHighlightContext.Provider value={ancestorHighlight}>
                <ReactFlow
                  key={instanceKey}
                  id="story-flow"
                  colorMode="dark"
                  //   snapToGrid={true}
                  snapGrid={[20, 20]}
                  panOnDrag={[2]}
                  deleteKeyCode={["Delete", "Backspace"]}
                  nodeTypes={nodeTypes}
                  edgeTypes={edgeTypes}
                  defaultNodes={nodes}
                  defaultEdges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={onConnect}
                  onConnectEnd={onConnectEnd}
                  onNodesDelete={onNodesDelete}
                  onBeforeDelete={onBeforeDelete}
                  onDelete={onDelete}
                  onNodeDrag={onNodeDrag}
                  onNodeDragStop={onNodeDragStop}
                  defaultEdgeOptions={defaultEdgeOptions}
                  isValidConnection={isValidConnection}
                  selectionOnDrag
                  selectionMode={SelectionMode.Partial}
                  minZoom={0.1}
                  maxZoom={2}
                  fitView
                >
                  <Background
                    color="#505050ff"
                    variant={BackgroundVariant.Dots}
                  />
                  <Controls
                    position="top-left"
                    showInteractive={false}
                  ></Controls>
                  <Panel position="top-center">
                    <Button
                      variant="filled"
                      onClick={() => createMilestone()}
                      leftSection={<IconScriptPlus size={20} />}
                    >
                      {t("storyTabNewMilestone")}
                    </Button>

                    <Button
                      variant="filled"
                      color="teal"
                      onClick={() => createJunction("or")}
                      ml="xs"
                      leftSection={<IconLogicOr size={20} />}
                    >
                      {t("storyTabOr")}
                    </Button>

                    <Button
                      variant="outline"
                      onClick={handleReflow}
                      ml="xs"
                      leftSection={<IconSitemap size={20} />}
                    >
                      {t("storyTabOrganize")}
                    </Button>
                  </Panel>
                </ReactFlow>
              </AncestorHighlightContext.Provider>
            </div>
          </Flex>
        </Split.Pane>

        <Split.Resizer />

        {/* Right panel */}
        <Split.Pane
          initialWidth={400}
          minWidth={200}
          maxWidth={600}
          onResizeEnd={handlePaneResize}
        >
          <Stack h="100%" style={{ overflow: "hidden" }} pb="xl">
            <Tip tips={rightTips} />
            <ScrollArea type="never" style={{ flex: 1 }}>
              <Stack p={0} pb="xl">
                {showMilestoneEditor && (
                  <MilestoneEditor
                    key={selectedNodeId}
                    nodeId={selectedNodeId}
                    autoFocus={selectedNodeId === newlyCreatedNodeId}
                  />
                )}
              </Stack>
            </ScrollArea>
          </Stack>
        </Split.Pane>
      </Split>

      {/* <FloatingMenu
        pos={contextMenu}
        opened={contextMenu !== null}
        position="bottom"
        withArrow
      >
        <Menu.Label>Story Node Actions</Menu.Label>
        <Menu.Item onClick={handleAddDialogue}>Link NPC dialogue</Menu.Item>
      </FloatingMenu> */}

      <WaypointLinkModal
        opened={waypointModalOpen}
        onClose={closeWaypointModal}
        onSave={onSaveWaypoint}
        initialValues={editingWaypoint ?? undefined}
        usedCharacterIds={
          waypointModalNode?.data.waypoints?.map((w) => w.characterId) ?? []
        }
      />
    </WaypointModalContext.Provider>
  );
}
