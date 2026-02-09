import { Split } from "@gfazioli/mantine-split-pane";
import {
  Box,
  Button,
  Flex,
  Group,
  MultiSelect,
  RenderTreeNodePayload,
  ScrollArea,
  Stack,
  Text,
  Textarea,
  TextInput,
  Tree,
  TreeNodeData,
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
import { selectors as mapSelectors } from "../../slices/mapEditor";
import { selectors as tsSelectors } from "../../slices/tilesetEditor";
import type { RootState } from "../../store/store";
import { store } from "../../store/store";
import type { DNode } from "../../types/dialogue";
import type { NpcTemplate } from "../../types/npc";
import TileAnimation from "../TileAnimation";
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
  const npcs = useSelector(mapSelectors.selectNpcs);
  const milestones = useSelector((state: RootState) => state.story.nodes);

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

  const treeData: TreeNodeData[] = useMemo(() => {
    const state = store.getState();

    return npcs
      .filter((npc) => npc.name && npc.name.length > 0)
      .map((npc) => {
        const npcTemplate = tsSelectors.templateFromId(
          state,
          npc.tsObjId,
        ) as NpcTemplate;

        return {
          value: npc.id,
          label: npc.name,
          nodeProps: {
            npcTemplate,
          },
          children: [
            {
              value: "dialogue1",
              label: "Dialogue 1",
            },
            {
              value: "dialogue2",
              label: "Dialogue 2",
            },
          ],
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
              <Tree
                data={treeData}
                selectOnClick
                renderNode={(payload) => <Leaf {...payload} />}
              />
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
              <MultiSelect
                label="Milestones"
                description="Which story milestones activate this dialogue?"
                searchable
                defaultValue={["default"]}
                data={["default", ...milestones.map((m) => m.data.id)]}
                nothingFoundMessage="No milestones found"
              />
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
  selected,
  elementProps,
}: RenderTreeNodePayload) {
  const npcTemplate = node.nodeProps?.npcTemplate as NpcTemplate | undefined;

  let icon: React.ReactNode;
  if (npcTemplate) {
    if (selected) {
      icon = (
        <TileAnimation
          frames={npcTemplate.animations.WalkDown.animation.frames}
          scale={2}
        />
      );
    } else {
      const tg = npcTemplate.animations.Idle.animation.frames[0]!.tg;
      icon = <TilesetGroup scale={2} group={tg} />;
    }
  }
  const isNpc = !!icon;

  if (isNpc) {
    return (
      <Box p="xs" {...elementProps}>
        <Group gap="md">
          {icon}
          <Text fz="sm">{node.label}</Text>
        </Group>
      </Box>
    );
  } else {
    return (
      <Box p="xs" {...elementProps} pl="md">
        <Text fz="sm">{node.label}</Text>
      </Box>
    );
  }
}
