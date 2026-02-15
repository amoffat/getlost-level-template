import { useAppDispatch } from "@/hooks/redux";
import { actions as dActions } from "@/slices/dialogue";
import { selectors as mapSelectors } from "@/slices/mapEditor";
import { selectors as tsSelectors } from "@/slices/tilesetEditor";
import type { RootState } from "@/store/store";
import { store } from "@/store/store";
import type { DNode } from "@/types/dialogue";
import type { NpcTemplate } from "@/types/npc";
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
  Tree,
  TreeNodeData,
} from "@mantine/core";
import { useDebouncedCallback } from "@mantine/hooks";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  Controls,
  Edge,
  OnConnect,
  OnEdgesChange,
  OnNodesChange,
  Panel,
  ReactFlow,
  SelectionMode,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { use, useCallback, useMemo, useRef } from "react";
import { useSelector } from "react-redux";
import TileAnimation from "../TileAnimation";
import TilesetGroup from "../TilesetGroup";
import DialogueNode from "../flowNodes/DialogueNode";

export default function DialogueTab({
  initPromise,
}: {
  initPromise: Promise<unknown>;
}) {
  use(initPromise);

  const reactFlowInstance = useReactFlow<DNode, Edge>();
  const dispatch = useAppDispatch();
  const npcs = useSelector(mapSelectors.selectNpcs);
  const milestones = useSelector((state: RootState) => state.story.nodes);
  const nodes = useSelector((state: RootState) => state.dialogue.nodes);
  const edges = useSelector((state: RootState) => state.dialogue.edges);
  const { screenToFlowPosition } = useReactFlow();
  const flowContainerRef = useRef<HTMLDivElement>(null);

  const onNodesChange: OnNodesChange<DNode> = useDebouncedCallback(
    (changes) => {
      const nodes = reactFlowInstance.getNodes();
      dispatch(dActions.syncFromRF(applyNodeChanges(changes, nodes)));
    },
    500,
  );

  const onEdgesChange: OnEdgesChange = useDebouncedCallback((changes) => {
    const edges = reactFlowInstance.getEdges();
    dispatch(dActions.setEdges(applyEdgeChanges(changes, edges)));
  }, 500);

  const onConnect: OnConnect = useCallback(
    (connection) => {
      dispatch(dActions.setEdges(addEdge(connection, edges)));
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

    const id = crypto.randomUUID();
    const newNode: DNode = {
      id,
      position,
      selected: true,
      type: "dialogue",
      data: {
        id,
        label: "TODO",
        content: undefined,
        animated: true,
        choices: [],
      },
    };

    const updatedNodes: DNode[] = [
      ...reactFlowInstance
        .getNodes()
        .map((existingNode) => ({ ...existingNode, selected: false })),
      { ...newNode, selected: true },
    ];

    reactFlowInstance.setNodes(updatedNodes);
    dispatch(dActions.syncFromRF(updatedNodes));
  }, [dispatch, screenToFlowPosition, reactFlowInstance]);

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
        initialWidth="15%"
        minWidth={250}
        maxWidth="45%"
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
              nodeTypes={{
                dialogue: DialogueNode,
                sign: DialogueNode,
              }}
              snapGrid={[20, 20]}
              panOnDrag={[2]}
              deleteKeyCode={["Delete", "Backspace"]}
              multiSelectionKeyCode={null}
              defaultNodes={Object.values(nodes)}
              defaultEdges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              selectionOnDrag={false}
              selectionMode={SelectionMode.Partial}
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
        initialWidth="20%"
        minWidth={250}
        maxWidth="45%"
        onResizeEnd={handlePaneResize}
      >
        <Stack h="100%" style={{ overflow: "hidden" }}>
          <ScrollArea type="never" style={{ flex: 1 }}>
            <Stack p={0} pb="md">
              <MultiSelect
                label="Milestones"
                description="Which story milestones activate this dialogue?"
                searchable
                defaultValue={["default"]}
                data={["default", ...milestones.map((m) => m.data.id)]}
                nothingFoundMessage="No milestones found"
              />
            </Stack>
          </ScrollArea>
        </Stack>
      </Split.Pane>
    </Split>
  );
}

function Leaf({ node, selected, elementProps }: RenderTreeNodePayload) {
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
