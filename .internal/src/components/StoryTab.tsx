import type { StoryNode as DNode } from "@/slices/story";
import { setEdges, setNodes } from "@/slices/story";
import { loadStoryThunk, reflowStoryThunk } from "@/thunks/story";
import { Vector2 } from "@/vec";
import { Split } from "@gfazioli/mantine-split-pane";
import { Flex, Menu, ScrollArea, Stack } from "@mantine/core";
import { IconRefresh } from "@tabler/icons-react";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  ControlButton,
  Controls,
  MiniMap,
  OnConnect,
  OnEdgesChange,
  OnNodesChange,
  ReactFlow,
  SelectionMode,
  type Edge,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "../hooks/redux";
import type { RootState } from "../store/store";
import FloatingMenu from "./FloatingMenu";
import StoryNode from "./StoryNode";

export default function StoryTab() {
  const [_nodeId, setNodeId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<Vector2 | null>(null);
  const dispatch = useAppDispatch();
  const dState = useSelector((state: RootState) => state.story);
  const { nodes, edges } = dState;
  const flowContainerRef = useRef<HTMLDivElement>(null);
  const reactFlowInstanceRef = useRef<ReactFlowInstance<DNode, Edge> | null>(
    null,
  );

  // Selection state can be used later for editing panel

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
                nodeTypes={{ default: StoryNode }}
                nodes={nodes}
                edges={edges}
                onNodeClick={onSelectNode}
                onNodeDragStart={onSelectNode}
                onNodeContextMenu={handleNodeContextMenu}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onPaneClick={handlePaneClick}
                onInit={(instance: ReactFlowInstance<DNode, Edge>) =>
                  (reactFlowInstanceRef.current = instance)
                }
                selectionOnDrag
                selectionMode={SelectionMode.Partial}
                minZoom={0.1}
                maxZoom={2}
                fitView
              >
                <MiniMap pannable zoomable />
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
            <ScrollArea type="never" style={{ flex: 1 }}>
              <Stack p={0} pb={50}>
                {/* Right panel content will go here */}
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
