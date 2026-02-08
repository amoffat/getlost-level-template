import { Split } from "@gfazioli/mantine-split-pane";
import {
  Button,
  Fieldset,
  Flex,
  Group,
  RenderTreeNodePayload,
  ScrollArea,
  Stack,
  Switch,
  Textarea,
  TextInput,
  Tree,
} from "@mantine/core";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  Controls,
  OnConnect,
  OnEdgesChange,
  OnNodesChange,
  Panel,
  ReactFlow,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { use, useCallback, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "../../hooks/redux";
import { setEdges, setNodeData, setNodes } from "../../slices/dialogue";
import { selectors } from "../../slices/mapEditor";
import { selectors as tsSelectors } from "../../slices/tilesetEditor";
import type { RootState } from "../../store/store";
import { store } from "../../store/store";
import type { DNode } from "../../types/dialogue";
import type { NpcTemplate } from "../../types/npc";
import TilesetGroup from "../TilesetGroup";

export default function DialogueTab({
  initPromise,
}: {
  initPromise: Promise<unknown>;
}) {
  use(initPromise);

  const [nodeId, setNodeId] = useState<string | null>(null);
  const dispatch = useAppDispatch();
  const dState = useSelector((state: RootState) => state.dialogue);
  const { nodes, edges } = dState;
  const { screenToFlowPosition } = useReactFlow();
  const flowContainerRef = useRef<HTMLDivElement>(null);
  const npcs = useSelector(selectors.selectNpcs);

  const node = nodes.find((n) => n.id === nodeId) || null;
  const nd = node?.data;

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

  const createNode = useCallback(() => {
    // Compute the center of the visible flow viewport and convert to flow coordinates
    const rect = flowContainerRef.current?.getBoundingClientRect();
    let position = { x: 0, y: 0 };
    if (rect) {
      const centerScreen = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
      position = screenToFlowPosition(centerScreen);
    }

    const newNode: DNode = {
      id: (nodes.length + 1).toString(),
      position,
      type: "default",
      data: { label: `Node ${nodes.length + 1}`, content: "", animated: false },
    };
    dispatch(setNodes(nodes.concat(newNode)));
  }, [nodes, dispatch, screenToFlowPosition]);

  const onSelectNode = useCallback(
    (_event: React.MouseEvent, node: DNode) => {
      setNodeId(node.id);
    },
    [setNodeId],
  );

  const onSwitchAnimated = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!node) return;
      const animated = event.currentTarget.checked;
      dispatch(setNodeData({ id: node.id, data: { animated } }));
    },
    [node, dispatch],
  );

  const onTitleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!node) return;
      const label = event.currentTarget.value;
      dispatch(setNodeData({ id: node.id, data: { label } }));
    },
    [node, dispatch],
  );

  const onContentChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (!node) return;
      const content = event.currentTarget.value;
      dispatch(setNodeData({ id: node.id, data: { content } }));
    },
    [node, dispatch],
  );

  const handlePaneResize = () => {
    // Trigger redrawLayout when panels are resized
    // Use a small delay to ensure the DOM has updated
    requestAnimationFrame(() => {
      window.dispatchEvent(new Event("resize"));
    });
  };

  const treeData = useMemo(() => {
    const state = store.getState();

    return npcs
      .filter((npc) => npc.name && npc.name.length > 0)
      .map((npc) => {
        const npcTemplate = tsSelectors.templateFromId(
          state,
          npc.tsObjId,
        ) as NpcTemplate;
        const tg = npcTemplate.animations.Idle.animation.frames[0]!.tg;
        const icon = <TilesetGroup key={npc.id} scale={3} group={tg} />;

        return {
          value: npc.id,
          label: npc.name,
          nodeProps: {
            icon,
          },
        };
      });
  }, [npcs]);

  return (
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
            <Stack p={0}>
              <Fieldset legend="NPCs" p="xs">
                <Tree
                  data={treeData}
                  renderNode={(payload) => <Leaf {...payload} />}
                />
              </Fieldset>
            </Stack>
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
              id="dialogue-flow"
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
              fitView
            >
              <Background color="#505050ff" variant={BackgroundVariant.Dots} />
              <Controls position="top-left"></Controls>
              <Panel position="top-center">
                <Button variant="filled" onClick={createNode}>
                  New node
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
          <ScrollArea type="never" style={{ flex: 1 }}>
            <Stack p={0} pb={50}>
              <TextInput
                label="Dialogue title"
                description="A summary or title for this dialogue node."
                value={nd?.label ?? ""}
                onChange={onTitleChange}
              />
              <Textarea
                rows={10}
                label="Dialogue content"
                value={nd?.content ?? ""}
                description="The text that will be displayed to the player."
                onChange={onContentChange}
              />
              <Switch
                label="Animated"
                checked={nd?.animated ?? false}
                onChange={onSwitchAnimated}
                description="If enabled, the text will appear with a typewriter animation."
              />
            </Stack>
          </ScrollArea>
        </Stack>
      </Split.Pane>
    </Split>
  );
}

function Leaf({
  node,
  expanded,
  hasChildren,
  elementProps,
}: RenderTreeNodePayload) {
  return (
    <Group gap="md" {...elementProps} mb="xs">
      {node.nodeProps?.icon}
      <span>{node.label}</span>
    </Group>
  );
}
