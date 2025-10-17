import type { StoryNode as DNode } from "@/slices/story";
import { setEdges, setNodes } from "@/slices/story";
import { loadStoryThunk, reflowStoryThunk } from "@/thunks/story";
import { Flex } from "@mantine/core";
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

export default function StoryTab() {
  const [_nodeId, setNodeId] = useState<string | null>(null);
  const dispatch = useAppDispatch();
  const dState = useSelector((state: RootState) => state.story);
  const { nodes, edges } = dState;
  const flowContainerRef = useRef<HTMLDivElement>(null);
  const reactFlowInstanceRef = useRef<ReactFlowInstance<DNode, Edge> | null>(
    null
  );

  // Selection state can be used later for editing panel

  const onNodesChange: OnNodesChange<DNode> = useCallback(
    (changes) => {
      dispatch(setNodes(applyNodeChanges(changes, nodes)));
    },
    [dispatch, nodes]
  );
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      dispatch(setEdges(applyEdgeChanges(changes, edges)));
    },
    [dispatch, edges]
  );
  const onConnect: OnConnect = useCallback(
    (connection) => {
      dispatch(setEdges(addEdge(connection, edges)));
    },
    [dispatch, edges]
  );

  const onSelectNode = useCallback(
    (_event: React.MouseEvent, node: DNode) => {
      setNodeId(node.id);
    },
    [setNodeId]
  );

  useEffect(() => {
    dispatch(loadStoryThunk()).unwrap();
  }, [dispatch]);

  const handleReflow = useCallback(async () => {
    await dispatch(reflowStoryThunk()).unwrap();
  }, [dispatch]);

  return (
    <Flex
      style={{ height: "100dvh" }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div ref={flowContainerRef} style={{ flex: 4 }}>
        <ReactFlow
          id="story-flow"
          colorMode="dark"
          //   snapToGrid={true}
          snapGrid={[20, 20]}
          panOnDrag={[2]}
          nodes={nodes}
          edges={edges}
          onNodeClick={onSelectNode}
          onNodeDragStart={onSelectNode}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onPaneClick={() => setNodeId(null)}
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
          <Background color="#505050ff" variant={BackgroundVariant.Dots} />
          <Controls position="top-left">
            <ControlButton onClick={handleReflow} title="Auto layout">
              <IconRefresh size={16} />
            </ControlButton>
          </Controls>
        </ReactFlow>
      </div>
    </Flex>
  );
}
