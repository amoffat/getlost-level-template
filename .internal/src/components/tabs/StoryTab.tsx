import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import type { StoryNode as DNode } from "@/slices/story";
import { setEdges, setNodes } from "@/slices/story";
import type { RootState } from "@/store/store";
import { reflowStoryThunk } from "@/thunks/story";
import { showNotification } from "@/utils/notifications";
import { Split } from "@gfazioli/mantine-split-pane";
import { Button, Flex, ScrollArea, Stack } from "@mantine/core";
import { useDebouncedCallback } from "@mantine/hooks";
import { IconLogicOr, IconScriptPlus, IconSitemap } from "@tabler/icons-react";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  Controls,
  getOutgoers,
  IsValidConnection,
  OnConnect,
  OnEdgesChange,
  OnNodesChange,
  Panel,
  ReactFlow,
  SelectionMode,
  useOnSelectionChange,
  useReactFlow,
  type Edge,
  type OnConnectEnd,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ReactNode, use, useCallback, useMemo, useRef, useState } from "react";
import StoryEdge from "../flowEdges/StoryEdge";
import OrNode from "../flowNodes/OrNode";
import StoryNode from "../flowNodes/StoryNode";
import MilestoneEditor from "../MilestoneEditor";
import Tip from "../Tip";

export default function StoryTab({
  initPromise,
}: {
  initPromise: Promise<unknown>;
}) {
  use(initPromise);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const dispatch = useAppDispatch();

  const dState = useAppSelector((state: RootState) => state.story);
  const { nodes, edges } = dState;
  const flowContainerRef = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useReactFlow<DNode, Edge>();
  const { screenToFlowPosition, getNodes, getEdges } = reactFlowInstance;

  const onNodesChange: OnNodesChange<DNode> = useDebouncedCallback(
    (changes) => {
      const currentNodes = reactFlowInstance.getNodes();
      dispatch(setNodes(applyNodeChanges(changes, currentNodes)));
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

      const hasCycle = (node: DNode, visited = new Set()) => {
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
      const newNode: DNode = {
        id: newNodeId,
        position,
        type: "story",
        selected: true,
        data: {
          id: newNodeId,
          npcs: [],
        },
      };

      const updatedNodes: DNode[] = [
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

        const newEdge: Edge = {
          id: crypto.randomUUID(),
          source,
          target,
        };

        const updatedEdges = [...reactFlowInstance.getEdges(), newEdge];
        reactFlowInstance.setEdges(updatedEdges);
        dispatch(setEdges(updatedEdges));
      }

      setSelectedNodeId(newNodeId);
    },
    [dispatch, reactFlowInstance, screenToFlowPosition],
  );

  const createJunction = useCallback(
    (kind: "and" | "or") => {
      const rect = flowContainerRef.current?.getBoundingClientRect();
      const centerScreen = rect
        ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
        : { x: 0, y: 0 };
      const position = screenToFlowPosition(centerScreen);

      const newNodeId = crypto.randomUUID();
      const currentNodes = reactFlowInstance.getNodes();
      const newNode: DNode = {
        id: newNodeId,
        position,
        type: kind,
        selected: true,
        data: {
          id: newNodeId,
          kind,
        },
      };

      const updatedNodes: DNode[] = [
        ...currentNodes.map((n) => ({ ...n, selected: false })),
        newNode,
      ];

      reactFlowInstance.setNodes(updatedNodes);
      dispatch(setNodes(updatedNodes));
      setSelectedNodeId(newNodeId);
    },
    [dispatch, reactFlowInstance, screenToFlowPosition],
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

  useOnSelectionChange({
    onChange: ({ nodes: selectedNodes }) => {
      if (selectedNodes.length === 1) {
        setSelectedNodeId(selectedNodes[0].id);
      } else {
        setSelectedNodeId(null);
      }
    },
  });

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

  const tips: ReactNode[] = useMemo(() => {
    const tips = [];

    tips.push("Create new story milestone nodes.");

    return tips;
  }, []);

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
          <Stack h="100%" style={{ overflow: "hidden" }}>
            <ScrollArea type="never" style={{ flex: 1 }}>
              <Stack pb={50}>{/* Left panel content will go here */}</Stack>
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
              <ReactFlow
                id="story-flow"
                colorMode="dark"
                //   snapToGrid={true}
                snapGrid={[20, 20]}
                panOnDrag={[2]}
                deleteKeyCode={["Delete", "Backspace"]}
                nodeTypes={{ story: StoryNode, or: OrNode }}
                edgeTypes={{ default: StoryEdge }}
                defaultNodes={nodes}
                defaultEdges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onConnectEnd={onConnectEnd}
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
          <Stack h="100%" style={{ overflow: "hidden" }}>
            <Tip tips={tips} />
            <ScrollArea type="never" style={{ flex: 1 }}>
              <Stack p={0} pb={50}>
                {selectedNodeId && (
                  <MilestoneEditor
                    key={selectedNodeId}
                    nodeId={selectedNodeId}
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
