import { useAppDispatch } from "@/hooks/redux";
import { log } from "@/log";
import {
  createDialogue,
  actions as dActions,
  selectors as dSelectors,
} from "@/slices/dialogue";
import { selectors as mapSelectors } from "@/slices/mapEditor";
import { selectors as tsSelectors } from "@/slices/tilesetEditor";
import { store, type RootState } from "@/store/store";
import type { Dialogue, DNode } from "@/types/dialogue";
import type { NpcTemplate } from "@/types/npc";
import { showNotification } from "@/utils/notifications";
import { Split } from "@gfazioli/mantine-split-pane";
import {
  ActionIcon,
  Box,
  Button,
  Flex,
  Group,
  MultiSelect,
  RenderTreeNodePayload,
  ScrollArea,
  Stack,
  Text,
  Tooltip,
  Tree,
  TreeNodeData,
  useTree,
} from "@mantine/core";
import { useDebouncedCallback } from "@mantine/hooks";
import { IconAlertTriangle, IconPlus } from "@tabler/icons-react";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  Controls,
  Edge,
  OnBeforeDelete,
  OnConnect,
  OnEdgesChange,
  OnNodesChange,
  Panel,
  ReactFlow,
  SelectionMode,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { use, useCallback, useEffect, useMemo, useRef } from "react";
import { useSelector } from "react-redux";
import TileAnimation from "../TileAnimation";
import TilesetGroup from "../TilesetGroup";
import DialogueNode from "../flowNodes/DialogueNode";

interface NpcNodeProps {
  npcTemplate: NpcTemplate;
  npcId: string;
  onCreate: (dialogueId: string) => void;
}

interface DialogueNodeProps {
  dialogue: Dialogue;
}

function isNpcNode(props: Record<string, any>): props is NpcNodeProps {
  return "npcId" in props;
}

function isDialogueNode(
  props: Record<string, any>,
): props is DialogueNodeProps {
  return "dialogue" in props;
}

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
  const allDialogues = useSelector(dSelectors.allDialogues);
  const activeDialogueId = useSelector(
    (state: RootState) => state.dialogue.activeDialogueId,
  );
  const nodes = useSelector((state: RootState) =>
    dSelectors.activeNodes(state),
  );
  const edges = useSelector((state: RootState) =>
    dSelectors.activeEdges(state),
  );
  const { screenToFlowPosition } = useReactFlow();
  const flowContainerRef = useRef<HTMLDivElement>(null);
  const tree = useTree();

  const onNodesChange: OnNodesChange<DNode> = useDebouncedCallback(
    (changes) => {
      if (!activeDialogueId) return;
      const nodes = reactFlowInstance.getNodes();
      dispatch(
        dActions.setFromRF({
          dialogueId: activeDialogueId,
          nodes: applyNodeChanges(changes, nodes),
        }),
      );
    },
    200,
  );

  // Prevent deletion if it would leave the dialogue with no speeches
  const onBeforeDelete: OnBeforeDelete<DNode, Edge> = useCallback(
    async ({
      nodes: nodesToDelete,
    }: {
      nodes: DNode[];
      edges: Edge[];
    }): Promise<boolean> => {
      const currentNodes = reactFlowInstance.getNodes();
      if (currentNodes.length - nodesToDelete.length < 1) {
        showNotification({
          title: "Cannot delete",
          message: "At least one speech must remain in the dialogue",
          color: "orange",
        });
        return false; // Prevent deletion
      }
      return true; // Allow deletion
    },
    [reactFlowInstance],
  );

  const onEdgesChange: OnEdgesChange = useDebouncedCallback((changes) => {
    if (!activeDialogueId) return;
    const edges = reactFlowInstance.getEdges();
    dispatch(
      dActions.setEdges({
        dialogueId: activeDialogueId,
        edges: applyEdgeChanges(changes, edges),
      }),
    );
  }, 200);

  const onConnect: OnConnect = useCallback(
    (connection) => {
      if (!activeDialogueId) return;
      dispatch(
        dActions.setEdges({
          dialogueId: activeDialogueId,
          edges: addEdge(connection, edges),
        }),
      );
    },
    [dispatch, edges, activeDialogueId],
  );

  const createSpeech = useCallback(
    (dId: string | undefined = undefined) => {
      const dialogueId = dId ?? activeDialogueId;
      if (!dialogueId) {
        log.error("No active dialogue to add a node to");
        return;
      }

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
          label: undefined,
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
      dispatch(
        dActions.setFromRF({
          dialogueId,
          nodes: updatedNodes,
        }),
      );
    },
    [dispatch, screenToFlowPosition, reactFlowInstance, activeDialogueId],
  );

  // Sync ReactFlow when the active dialogue changes
  useEffect(() => {
    if (!activeDialogueId) return;
    const state = store.getState();
    const dlg = state.dialogue.dialogues.entities[activeDialogueId];
    if (!dlg) return;

    const newNodes = Object.values(dlg.nodes.entities) as DNode[];
    reactFlowInstance.setNodes(newNodes);

    const newEdges = dlg.edges.ids.map((id) => dlg.edges.entities[id] as Edge);
    reactFlowInstance.setEdges(newEdges);

    requestAnimationFrame(() => {
      reactFlowInstance.fitView({ padding: "25%" });
    });
  }, [activeDialogueId, reactFlowInstance]);

  const handlePaneResize = () => {
    // Trigger redrawLayout when panels are resized
    // Use a small delay to ensure the DOM has updated
    requestAnimationFrame(() => {
      window.dispatchEvent(new Event("resize"));
    });
  };

  const treeData: TreeNodeData[] = useMemo(() => {
    const state = store.getState();

    const tree: TreeNodeData[] = npcs
      .filter((npc) => npc.name && npc.name.length > 0)
      .map((npc) => {
        const npcTemplate = tsSelectors.templateFromId(
          state,
          npc.tsObjId,
        ) as NpcTemplate;

        const npcDialogues = allDialogues.filter(
          (dlg) => dlg.subjectId === npc.id,
        );

        const children = npcDialogues.flatMap((dlg) => {
          if (dlg.milestones.length === 0) {
            return [
              {
                value: dlg.id,
                label: dlg.id,
                nodeProps: {
                  dialogue: dlg,
                } satisfies DialogueNodeProps,
              },
            ];
          }

          return dlg.milestones.map((ms) => ({
            value: `${dlg.id}/${ms}`,
            label: ms,
            nodeProps: {
              dialogue: dlg,
            } satisfies DialogueNodeProps,
          }));
        });

        return {
          value: npc.id,
          label: npc.name,
          nodeProps: {
            npcTemplate,
            npcId: npc.id,
            onCreate: createSpeech,
          } satisfies NpcNodeProps,
          children,
        };
      });

    const unassigned = allDialogues.filter((dlg) => dlg.subjectId === null);
    tree.push({
      value: "unassigned",
      label: "Unassigned",
      nodeProps: {},
      children: unassigned.map((dlg) => ({
        value: dlg.id,
        label: dlg.id,
        nodeProps: {
          dialogue: dlg,
        },
      })),
    });
    return tree;
  }, [npcs, allDialogues, createSpeech]);

  return (
    <Split h="100dvh" style={{ flex: 1 }}>
      {/* Left panel */}
      <Split.Pane
        initialWidth="15%"
        minWidth={250}
        maxWidth="45%"
        onResizeEnd={handlePaneResize}
      >
        <Stack h="100%" style={{ overflow: "hidden" }} p={0}>
          <ScrollArea type="never" style={{ flex: 1 }}>
            <Stack p={0}>
              <Tree
                data={treeData}
                tree={tree}
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
              onBeforeDelete={onBeforeDelete}
              selectionOnDrag={false}
              selectionMode={SelectionMode.Partial}
              fitView
            >
              <Background color="#505050ff" variant={BackgroundVariant.Dots} />
              <Controls position="top-left"></Controls>
              <Panel position="top-center">
                <Button variant="filled" onClick={() => createSpeech()}>
                  New Speech
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

type LeafProps = Pick<
  RenderTreeNodePayload,
  "node" | "selected" | "elementProps" | "tree"
>;

function NpcLeaf({
  node,
  selected,
  elementProps,
  npcTemplate,
  onCreate,
  npcId,
  tree,
}: LeafProps & NpcNodeProps) {
  const dispatch = useAppDispatch();
  let icon: React.ReactNode;
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

  const handleAddDialogue = (e: React.MouseEvent) => {
    e.stopPropagation();
    const dId = crypto.randomUUID();
    dispatch(dActions.addDialogue(createDialogue(dId, npcId)));

    // Expand and select the parent NPC node
    tree.expand(npcId);
    tree.select(dId);

    onCreate(dId);
  };

  return (
    <Box p="xs" {...elementProps}>
      <Group gap="md">
        {icon}
        <Text fz="sm">{node.label}</Text>
        <Box style={{ flexGrow: 1 }} />
        <Tooltip label="Add new dialogue for this NPC">
          <ActionIcon variant="default" onClick={handleAddDialogue}>
            <IconPlus size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Box>
  );
}

function DialogueLeaf({ node, elementProps, selected }: LeafProps) {
  const dispatch = useAppDispatch();
  const props = node.nodeProps as DialogueNodeProps;

  const selectDialogue = useCallback(() => {
    if (!props.dialogue) return;
    dispatch(dActions.setActiveDialogue(props.dialogue.id));
  }, [dispatch, props.dialogue]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      elementProps.onClick?.(e);
      selectDialogue();
    },
    [elementProps, selectDialogue],
  );

  useEffect(() => {
    if (selected) {
      selectDialogue();
    }
  }, [selected, selectDialogue]);

  let content = <Text fz="sm">{node.label}</Text>;
  if ((props.dialogue as Dialogue | undefined)?.milestones.length === 0) {
    content = (
      <Group gap="md">
        <IconAlertTriangle size={16} color="orange" />
        <Text variant="dimmed">No milestone</Text>
      </Group>
    );
  }
  return (
    <Box p="xs" {...elementProps} onClick={handleClick} pl="lg">
      {content}
    </Box>
  );
}

function Leaf({ node, selected, elementProps, tree }: RenderTreeNodePayload) {
  const props = node.nodeProps!;

  if (isNpcNode(props)) {
    return (
      <NpcLeaf
        node={node}
        selected={selected}
        elementProps={elementProps}
        npcTemplate={props.npcTemplate}
        npcId={props.npcId}
        onCreate={props.onCreate}
        tree={tree}
      />
    );
  }

  return (
    <DialogueLeaf
      node={node}
      selected={selected}
      elementProps={elementProps}
      tree={tree}
    />
  );
}
