import type { StoryNode as DNode } from "@/slices/story";
import { setEdges, setNodeData, setNodes } from "@/slices/story";
import { loadStoryThunk, reflowStoryThunk } from "@/thunks/story";
import { showNotification } from "@/utils/notifications";
import { Vector2 } from "@/vec";
import { Split } from "@gfazioli/mantine-split-pane";
import {
  Fieldset,
  Flex,
  Menu,
  ScrollArea,
  Stack,
  TextInput,
} from "@mantine/core";
import { IconRefresh } from "@tabler/icons-react";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  ControlButton,
  Controls,
  getOutgoers,
  IsValidConnection,
  OnConnect,
  OnEdgesChange,
  OnNodesChange,
  ReactFlow,
  SelectionMode,
  useReactFlow,
  type Edge,
  type OnConnectEnd,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "../hooks/redux";
import type { RootState } from "../store/store";
import FloatingMenu from "./FloatingMenu";
import StoryNode from "./StoryNode";
import Tip from "./Tip";

export default function StoryTab() {
  const [nodeId, setNodeId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<Vector2 | null>(null);
  const dispatch = useAppDispatch();

  const dState = useSelector((state: RootState) => state.story);
  const { nodes, edges } = dState;
  const flowContainerRef = useRef<HTMLDivElement>(null);
  const reactFlowInstanceRef = useRef<ReactFlowInstance<DNode, Edge> | null>(
    null,
  );
  const { screenToFlowPosition, getNodes, getEdges } = useReactFlow<
    DNode,
    Edge
  >();

  const node = nodes.find((n) => n.id === nodeId) || null;
  const nd = node?.data;

  const onIdChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!node) return;
      const label = event.currentTarget.value;
      dispatch(setNodeData({ id: node.id, data: { label } }));
    },
    [node, dispatch],
  );

  const onNodesChange: OnNodesChange<DNode> = useCallback(
    (changes) => {
      dispatch(setNodes(applyNodeChanges(changes, nodes)));
    },
    [dispatch, nodes],
  );
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      dispatch(setEdges(applyEdgeChanges(changes, edges)));
    },
    [dispatch, edges],
  );
  const onConnect: OnConnect = useCallback(
    (connection) => {
      dispatch(setEdges(addEdge(connection, edges)));
    },
    [dispatch, edges],
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

  const onConnectEnd: OnConnectEnd = useCallback(
    (event, connectionState) => {
      // when a connection is dropped on the pane it's not valid
      if (!connectionState.isValid) {
        const { clientX, clientY } =
          "changedTouches" in event ? event.changedTouches[0] : event;
        const position = screenToFlowPosition({
          x: clientX,
          y: clientY,
        });

        // Create a new node at this position
        const newNodeId = `node-${Date.now()}`;
        const newNode: DNode = {
          id: newNodeId,
          position,
          type: "default",
          data: {
            id: newNodeId,
            label: `Milestone ${nodes.length + 1}`,
            npcs: {},
          },
        };
        const fromNodeId = connectionState.fromNode!.id;

        // Add the new node and edge
        dispatch(setNodes([...nodes, newNode]));
        dispatch(
          setEdges([
            ...edges,
            {
              id: `edge-${fromNodeId}-${newNodeId}`,
              source: fromNodeId,
              target: newNodeId,
            },
          ]),
        );
      }
    },
    [nodes, edges, dispatch, screenToFlowPosition],
  );

  const onSelectNode = useCallback(
    (_event: React.MouseEvent, node: DNode) => {
      setNodeId(node.id);
    },
    [setNodeId],
  );

  useEffect(() => {
    dispatch(loadStoryThunk()).unwrap();
  }, [dispatch]);

  const handleReflow = useCallback(async () => {
    await dispatch(reflowStoryThunk()).unwrap();
  }, [dispatch]);

  const handleNodeContextMenu = useCallback(
    (event: React.MouseEvent, _node: DNode) => {
      event.preventDefault();
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
      });
    },
    [],
  );

  const handlePaneClick = useCallback(() => {
    setNodeId(null);
    setContextMenu(null);
  }, []);

  const handleAddDialogue = useCallback(() => {
    // TODO: Implement add dialogue functionality
    console.log("Add dialogue stub function called");
    setContextMenu(null);
  }, []);

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
                nodeTypes={{ default: StoryNode }}
                nodes={nodes}
                edges={edges}
                onNodeClick={onSelectNode}
                onNodeDragStart={onSelectNode}
                onNodeContextMenu={handleNodeContextMenu}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onConnectEnd={onConnectEnd}
                onPaneClick={handlePaneClick}
                onInit={(instance: ReactFlowInstance<DNode, Edge>) =>
                  (reactFlowInstanceRef.current = instance)
                }
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
                <Controls position="top-left">
                  <ControlButton onClick={handleReflow} title="Auto layout">
                    <IconRefresh size={16} />
                  </ControlButton>
                </Controls>
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
                <Fieldset legend="Properties">
                  <TextInput
                    label="Milestone name"
                    description="A name to reference this milestone"
                    value={nd?.id ?? ""}
                    onChange={onIdChange}
                  />
                </Fieldset>
              </Stack>
            </ScrollArea>
          </Stack>
        </Split.Pane>
      </Split>

      <FloatingMenu
        pos={contextMenu}
        opened={contextMenu !== null}
        position="bottom"
        withArrow
      >
        <Menu.Label>Story Node Actions</Menu.Label>
        <Menu.Item onClick={handleAddDialogue}>Link NPC dialogue</Menu.Item>
      </FloatingMenu>
    </>
  );
}
