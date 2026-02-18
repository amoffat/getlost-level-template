import { useAppDispatch } from "@/hooks/redux";
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
  Fieldset,
  Flex,
  Group,
  MultiSelect,
  Overlay,
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
  useOnSelectionChange,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import SpeechEditor from "../SpeechEditor";
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

export default function DialogueTab({
  initPromise,
}: {
  initPromise: Promise<unknown>;
}) {
  use(initPromise);

  const reactFlowInstance = useReactFlow<DNode, Edge>();
  const dispatch = useAppDispatch();
  const { dlgid: dlgId } = useParams<{ dlgid?: string }>();
  const location = useLocation();
  const npcs = useSelector(mapSelectors.selectNpcs);
  const milestones = useSelector((state: RootState) => state.story.nodes);
  const allDialogues = useSelector(dSelectors.allDialogues);
  const activeDialogueId = useSelector(
    (state: RootState) => state.dialogue.activeDialogueId,
  );
  const tree = useTree();
  const navigate = useNavigate();

  // Sync activeDialogueId from URL parameter
  useEffect(() => {
    if (!dlgId) {
      // Only clear if we're still on the dialogue page
      const samePage = location.pathname.startsWith("/dialogues");
      if (!samePage) return;
      dispatch(dActions.setActiveDialogue(null));
      return;
    }

    if (dlgId !== activeDialogueId) {
      dispatch(dActions.setActiveDialogue(dlgId));
      tree.select(dlgId);
    }
  }, [dlgId, dispatch, location, activeDialogueId, tree]);

  // Sync ReactFlow when the active dialogue changes
  useEffect(() => {
    if (!activeDialogueId) return;
    const state = store.getState();
    const dlg = state.dialogue.dialogues.entities[activeDialogueId];
    if (!dlg) {
      navigate("/dialogues");
      return;
    }

    const newNodes = Object.values(dlg.nodes.entities) as DNode[];
    reactFlowInstance.setNodes(newNodes);

    const newEdges = dlg.edges.ids.map((id) => dlg.edges.entities[id] as Edge);
    reactFlowInstance.setEdges(newEdges);

    requestAnimationFrame(() => {
      reactFlowInstance.fitView({ padding: "25%" });
    });
  }, [activeDialogueId, reactFlowInstance, navigate]);

  const nodes = useSelector((state: RootState) =>
    dSelectors.activeNodes(state),
  );
  const edges = useSelector((state: RootState) =>
    dSelectors.activeEdges(state),
  );
  const { screenToFlowPosition } = useReactFlow();
  const flowContainerRef = useRef<HTMLDivElement>(null);

  // Track the currently selected node for the right-pane editor
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  useOnSelectionChange({
    onChange: ({ nodes: selectedNodes }) => {
      if (selectedNodes.length === 1) {
        setSelectedNodeId(selectedNodes[0].id);
      } else {
        setSelectedNodeId(null);
      }
    },
  });

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
    ({
      dialogueId,
      clear = false,
    }: {
      dialogueId: string | null;
      clear?: boolean;
    }) => {
      if (!dialogueId) return;

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

      // Deselect all existing nodes and add the new node as selected
      const existingNodes = clear ? [] : reactFlowInstance.getNodes();
      const updatedNodes: DNode[] = [
        ...existingNodes.map((n) => ({ ...n, selected: false })),
        { ...newNode, selected: true },
      ];

      reactFlowInstance.setNodes(updatedNodes);
      dispatch(
        dActions.setFromRF({
          dialogueId,
          nodes: updatedNodes,
        }),
      );
      setSelectedNodeId(id);
    },
    [dispatch, screenToFlowPosition, reactFlowInstance],
  );

  const onCreateDialogue = useCallback(
    (dialogueId: string) => {
      createSpeech({ dialogueId, clear: true });
      // Navigate to the new dialogue URL
      navigate(`/dialogues/${dialogueId}`);
    },
    [navigate, createSpeech],
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
            onCreate: onCreateDialogue,
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
  }, [npcs, allDialogues, onCreateDialogue]);

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
          style={{ height: "100%", position: "relative" }}
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
                <Button
                  variant="filled"
                  onClick={() => createSpeech({ dialogueId: activeDialogueId })}
                >
                  New Speech
                </Button>
              </Panel>
            </ReactFlow>
          </div>

          {!activeDialogueId && (
            <Overlay color="#000" backgroundOpacity={0.65} blur={4} zIndex={10}>
              <Stack align="center" justify="center" style={{ height: "100%" }}>
                <Text size="lg" c="dimmed">
                  Select a dialogue from the panel on the left to begin editing.
                </Text>
              </Stack>
            </Overlay>
          )}
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
            <Stack p={0} gap="md">
              <Fieldset legend="Dialogue" p="xs">
                <Stack p={0}>
                  <MultiSelect
                    label="Milestones"
                    description="Which story milestones activate this dialogue?"
                    searchable
                    defaultValue={["default"]}
                    data={["default", ...milestones.map((m) => m.data.id)]}
                    nothingFoundMessage="No milestones found"
                  />
                </Stack>
              </Fieldset>

              {selectedNodeId && (
                <SpeechEditor key={selectedNodeId} nodeId={selectedNodeId} />
              )}
            </Stack>
          </ScrollArea>
        </Stack>
      </Split.Pane>
    </Split>
  );
}

type LeafProps = Pick<
  RenderTreeNodePayload,
  "node" | "selected" | "elementProps" | "tree" | "expanded"
>;

function NpcLeaf({
  node,
  selected,
  elementProps,
  expanded,
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

  const handleAddDialogue = async (e: React.MouseEvent) => {
    e.stopPropagation();

    tree.expand(npcId);

    const dId = crypto.randomUUID();
    dispatch(dActions.addDialogue(createDialogue(dId, npcId)));

    onCreate(dId);
  };

  const showAddDialogue = expanded || selected;

  return (
    <Box p="xs" {...elementProps}>
      <Group gap="md">
        {icon}
        <Text fz="sm">{node.label}</Text>
        <Box style={{ flexGrow: 1 }} />
        {showAddDialogue && (
          <Tooltip label="Add new dialogue for this NPC">
            <ActionIcon variant="default" onClick={handleAddDialogue}>
              <IconPlus size={16} />
            </ActionIcon>
          </Tooltip>
        )}
      </Group>
    </Box>
  );
}

function DialogueLeaf({ node, elementProps }: LeafProps) {
  const navigate = useNavigate();
  const props = node.nodeProps as DialogueNodeProps;

  const selectDialogue = useCallback(() => {
    if (!props.dialogue) return;
    navigate(`/dialogues/${props.dialogue.id}`);
  }, [navigate, props.dialogue]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      elementProps.onClick?.(e);
      selectDialogue();
    },
    [elementProps, selectDialogue],
  );

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

function Leaf(payload: RenderTreeNodePayload) {
  const props = payload.node.nodeProps!;

  if (isNpcNode(props)) {
    return (
      <NpcLeaf
        npcTemplate={props.npcTemplate}
        npcId={props.npcId}
        onCreate={props.onCreate}
        {...payload}
      />
    );
  }

  return <DialogueLeaf {...payload} />;
}
