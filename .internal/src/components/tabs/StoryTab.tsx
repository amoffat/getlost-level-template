import { selectors } from "@/slices/mapEditor";
import type { StoryNode as DNode } from "@/slices/story";
import { setEdges, setNodeData, setNodes } from "@/slices/story";
import { reflowStoryThunk } from "@/thunks/story";
import { showNotification } from "@/utils/notifications";
import { Split } from "@gfazioli/mantine-split-pane";
import {
  Fieldset,
  Flex,
  ScrollArea,
  Select,
  Stack,
  TextInput,
} from "@mantine/core";
import { useDebouncedCallback } from "@mantine/hooks";
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
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ReactNode, use, useCallback, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "../../hooks/redux";
import type { RootState } from "../../store/store";
import { store } from "../../store/store";
import StoryNode from "../flowNodes/StoryNode";
import Tip from "../Tip";

export default function StoryTab({
  initPromise,
}: {
  initPromise: Promise<unknown>;
}) {
  use(initPromise);

  const [nodeId, setNodeId] = useState<string | null>(null);
  const dispatch = useAppDispatch();

  const dState = useSelector((state: RootState) => state.story);
  const { nodes, edges } = dState;
  const flowContainerRef = useRef<HTMLDivElement>(null);
  const npcs = useSelector(selectors.selectNpcs);
  const reactFlowInstance = useReactFlow<DNode, Edge>();
  const { screenToFlowPosition, getNodes, getEdges } = reactFlowInstance;

  const node = nodes.find((n) => n.id === nodeId) || null;
  const nd = node?.data;

  const onIdChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!node) return;
      const id = event.currentTarget.value;
      dispatch(setNodeData({ id: node.id, data: { id } }));
    },
    [node, dispatch],
  );

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
        const newNodeId = crypto.randomUUID();
        const currentNodes = reactFlowInstance.getNodes();
        const newNode: DNode = {
          id: newNodeId,
          position,
          type: "story",
          data: {
            id: `milestone-${currentNodes.length + 1}`,
            npcs: {},
          },
        };
        const fromNodeId = connectionState.fromNode!.id;
        const fromPosition = connectionState.fromHandle?.position;

        // Determine source and target based on connection origin
        // If connecting from bottom handle, existing node → new node
        // If connecting from top handle, new node → existing node
        const isFromBottom = fromPosition === "bottom";
        const source = isFromBottom ? fromNodeId : newNodeId;
        const target = isFromBottom ? newNodeId : fromNodeId;

        const newEdge: Edge = {
          id: crypto.randomUUID(),
          source,
          target,
        };

        // Add to flow immediately, then sync Redux.
        reactFlowInstance.addNodes(newNode);
        reactFlowInstance.addEdges(newEdge);
        dispatch(setNodes(reactFlowInstance.getNodes()));
        dispatch(setEdges(reactFlowInstance.getEdges()));
      }
    },
    [dispatch, reactFlowInstance, screenToFlowPosition],
  );

  const onSelectNode = useCallback(
    (_event: React.MouseEvent, node: DNode) => {
      setNodeId(node.id);
    },
    [setNodeId],
  );

  const handleReflow = useCallback(async () => {
    await dispatch(reflowStoryThunk()).unwrap();
    const { nodes: laidOutNodes, edges: laidOutEdges } = store.getState().story;
    reactFlowInstance.setNodes(laidOutNodes);
    reactFlowInstance.setEdges(laidOutEdges);
    requestAnimationFrame(() => {
      reactFlowInstance.fitView({ duration: 250, padding: 0.2 });
    });
  }, [dispatch, reactFlowInstance]);

  const handlePaneClick = useCallback(() => {
    setNodeId(null);
  }, []);

  const handlePaneResize = () => {
    // Trigger redrawLayout when panels are resized
    // Use a small delay to ensure the DOM has updated
    requestAnimationFrame(() => {
      window.dispatchEvent(new Event("resize"));
    });
  };

  const npcOptions = useMemo(() => {
    return npcs
      .filter((npc) => npc.name)
      .map((npc) => ({
        value: npc.id,
        label: npc.name!,
      }));
  }, [npcs]);

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
                nodeTypes={{ story: StoryNode }}
                defaultNodes={nodes}
                defaultEdges={edges}
                onNodeClick={onSelectNode}
                onNodeDragStart={onSelectNode}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onConnectEnd={onConnectEnd}
                onPaneClick={handlePaneClick}
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
                <Fieldset legend="Milestone Details" p="xs">
                  <TextInput
                    label="Name"
                    description="A name to reference this milestone. Must be unique."
                    value={nd?.id ?? ""}
                    onChange={onIdChange}
                  />
                </Fieldset>
                <Fieldset legend="NPC Dialogue" p="xs">
                  <Select
                    label="NPC"
                    description="Whose dialogue should change at this milestone?"
                    placeholder="Choose an NPC"
                    data={npcOptions}
                  />
                </Fieldset>
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
