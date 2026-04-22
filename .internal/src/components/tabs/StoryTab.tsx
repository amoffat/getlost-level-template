import { AncestorHighlightContext } from "@/contexts/AncestorHighlightContext";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import {
  JunctionNode,
  setEdges,
  setNodes,
  StoryEdge,
  StoryNode,
} from "@/slices/story";
import type { RootState } from "@/store/store";
import { reflowStoryThunk } from "@/thunks/story";
import { showNotification } from "@/utils/notifications";
import { Split } from "@gfazioli/mantine-split-pane";
import { Button, Flex, ScrollArea, Stack } from "@mantine/core";
import { useDebouncedCallback } from "@mantine/hooks";
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
import { useNavigate, useParams } from "react-router-dom";
import StoryEdgeComponent from "../flowEdges/StoryEdge";
import OrNode from "../flowNodes/OrNode";
import StoryNodeComponent from "../flowNodes/StoryNode";
import MilestoneEditor from "../MilestoneEditor";
import MilestoneList from "../MilestoneList";
import Tip from "../Tip";

import "@/styles/react-flow.css";

export default function StoryTab({
  initPromise,
}: {
  initPromise: Promise<unknown>;
}) {
  use(initPromise);

  const { nodeid: nodeIdParam } = useParams<{ nodeid?: string }>();
  const navigate = useNavigate();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [newlyCreatedNodeId, setNewlyCreatedNodeId] = useState<string | null>(
    null,
  );
  const dispatch = useAppDispatch();

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
    [reactFlowInstance],
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

  const onNodesChange: OnNodesChange<StoryNode> = useDebouncedCallback(
    (changes) => {
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
          title: "Invalid connection",
          message: "Creating this connection would create a cycle.",
          color: "red",
          autoClose: 5000,
        });
      }
      return isValid;
    },
    [getNodes, getEdges],
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
      setSelectedNodeId(null);
      return;
    }
    const currentNodes = reactFlowInstance.getNodes();
    if (!currentNodes.some((n) => n.id === nodeIdParam)) return;
    reactFlowInstance.setNodes(
      currentNodes.map((n) => ({ ...n, selected: n.id === nodeIdParam })),
    );
    setSelectedNodeId(nodeIdParam);
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

  const handleMilestoneSelect = useCallback(
    (nodeIds: string[]) => {
      const currentNodes = reactFlowInstance.getNodes();
      const selectedSet = new Set(nodeIds);
      const updatedNodes = currentNodes.map((n) => ({
        ...n,
        selected: selectedSet.has(n.id),
      }));
      reactFlowInstance.setNodes(updatedNodes);
      // setSelectedNodeId is also updated via useOnSelectionChange,
      // but set it immediately so ancestorHighlight reacts without delay.
      setSelectedNodeId(nodeIds.length === 1 ? nodeIds[0] : null);
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

  const showMilestoneEditor = selectedNodeId && isStoryNode;
  const showDependencyMilestones = nodes.length > 0;

  const rightTips: ReactNode[] = useMemo(() => {
    const tips = [];

    if (nodes.length === 0) {
      tips.push("Create new story milestone nodes.");
    } else {
      tips.push(
        "Give nodes good names by selecting them and editing them below.",
      );
      tips.push(
        "A milestone should be a thing that can be achieved in the level.",
      );
      tips.push(
        "New nodes can be created by dragging off of an existing node.",
      );
    }

    if (nodes.length > 0 && edges.length > 0) {
      tips.push(
        "A node can be inserted into an existing connection by dragging it over the connection.",
      );
      tips.push(
        "Delete an node or connection by selecting it and pressing the delete key.",
      );
    }

    return tips;
  }, [nodes, edges]);

  return (
    <>
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
                    selectedNodeIds={selectedNodeId ? [selectedNodeId] : []}
                    ancestorHighlight={ancestorHighlight}
                    onSelect={handleMilestoneSelect}
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
                  nodeTypes={{ story: StoryNodeComponent, or: OrNode }}
                  edgeTypes={{ default: StoryEdgeComponent }}
                  defaultNodes={nodes}
                  defaultEdges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={onConnect}
                  onConnectEnd={onConnectEnd}
                  onNodesDelete={onNodesDelete}
                  onBeforeDelete={onBeforeDelete}
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
                      New Milestone
                    </Button>

                    <Button
                      variant="filled"
                      color="teal"
                      onClick={() => createJunction("or")}
                      ml="xs"
                      leftSection={<IconLogicOr size={20} />}
                    >
                      OR
                    </Button>

                    <Button
                      variant="outline"
                      onClick={handleReflow}
                      ml="xs"
                      leftSection={<IconSitemap size={20} />}
                    >
                      Organize
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
          initialWidth={300}
          minWidth={200}
          maxWidth={500}
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
    </>
  );
}
