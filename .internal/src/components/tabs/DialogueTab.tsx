import { defaultMilestone } from "@/constants";
import { shallowEqual, useAppDispatch, useAppSelector } from "@/hooks/redux";
import {
  createDialogue,
  actions as dActions,
  selectors as dSelectors,
} from "@/slices/dialogue";
import { selectors as mapSelectors } from "@/slices/mapEditor";
import { selectors as tsSelectors } from "@/slices/tilesetEditor";
import { store } from "@/store/store";
import {
  reflowDialogueThunk,
  setDefaultDialogueThunk,
  unlinkDialogueThunk,
} from "@/thunks/dialogue";
import type { Dialogue, DNode } from "@/types/dialogue";
import { isNpcInstance, isTileGroupInstance } from "@/types/map";
import type { NpcRequiredAnimation, NpcTemplate } from "@/types/npc";
import { TileGroupTemplate } from "@/types/tilegroup";
import { createUrlPath } from "@/utils/dialogue";
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
  Typography,
  useTree,
} from "@mantine/core";
import { useDebouncedCallback } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import {
  IconAlertTriangle,
  IconBubbleText,
  IconPlus,
  IconSitemap,
  IconTrash,
  IconUnlink,
} from "@tabler/icons-react";
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
  OnConnectEnd,
  OnEdgesChange,
  OnNodesChange,
  Panel,
  ReactFlow,
  SelectionMode,
  useOnSelectionChange,
  useReactFlow,
} from "@xyflow/react";
import {
  ReactElement,
  ReactNode,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import InfoTooltip from "../common/InfoTooltip";
import DialogueNode from "../flowNodes/DialogueNode";
import { ItemStatus } from "../modals/ItemizedConfirmModal";
import PanelLoader from "../PanelLoader";
import SpeechEditor from "../SpeechEditor";
import TileAnimation from "../TileAnimation";
import TilesetGroup from "../TilesetGroup";
import Tip from "../Tip";

import "@/styles/react-flow.css";

interface ObjNodeProps {
  getIcon: (isActive: boolean, expanded: boolean) => ReactElement;
  objId: string;
  onCreate: (dialogueId: string) => void;
}

interface DialogueNodeProps {
  dialogue: Dialogue;
  onSelect?: (value: string) => void;
}

function isObjNode(props: Record<string, any>): props is ObjNodeProps {
  return "objId" in props;
}

export default function DialogueTab({
  initPromise,
}: {
  initPromise: Promise<unknown>;
}) {
  use(initPromise);

  const reactFlowInstance = useReactFlow<DNode, Edge>();
  const dispatch = useAppDispatch();
  const { dlgid: dlgId, milestone: msId } = useParams<{
    dlgid?: string;
    milestone?: string;
  }>();
  const location = useLocation();
  const speakers = useAppSelector(mapSelectors.speakers);
  const availableMilestones = useAppSelector(dSelectors.availableMilestones);
  const allDialogues = useAppSelector(dSelectors.allDialogues);
  const storyNodes = useAppSelector((state) => state.story.nodes);
  const activeDialogueId = useAppSelector(
    (state) => state.dialogue.activeDialogueId,
  );
  const { activeMilestones, activeNodes, activeEdges } = useAppSelector(
    (state) => ({
      activeMilestones: dSelectors.activeMilestones(state),
      activeNodes: dSelectors.activeNodes(state),
      activeEdges: dSelectors.activeEdges(state),
    }),
    shallowEqual,
  );
  const tree = useTree();
  const treeSelectRef = useRef(tree.select);
  treeSelectRef.current = tree.select;
  const navigate = useNavigate();

  const sortedSpeakers = useMemo(() => {
    return [...speakers].sort((a, b) => a.name.localeCompare(b.name));
  }, [speakers]);

  // Sync activeDialogueId from URL parameter
  useEffect(() => {
    if (!dlgId) {
      // Only clear if we're still on the dialogue page
      const samePage = location.pathname.startsWith("/dialogues");
      if (!samePage) return;
      dispatch(dActions.setActiveDialogue(null));
      return;
    }

    const state = store.getState();
    const dialogue = dSelectors.selectDialogue(state, dlgId);
    if (!dialogue) {
      navigate("/dialogues");
      return;
    }

    if (
      dlgId !== activeDialogueId ||
      !tree.selectedState.includes(createUrlPath(dlgId, msId ?? null))
    ) {
      dispatch(dActions.setActiveDialogue(dlgId));
      tree.select(createUrlPath(dlgId, msId ?? null));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dlgId, msId, dispatch, location, activeDialogueId]);

  // Sync ReactFlow when the active dialogue changes
  useEffect(() => {
    if (!activeDialogueId) {
      reactFlowInstance.setNodes([]);
      reactFlowInstance.setEdges([]);
      return;
    }

    const state = store.getState();
    const activeDialogue = dSelectors.selectDialogue(state, activeDialogueId);
    if (!activeDialogue) return;

    const newNodes = Object.values(activeDialogue.nodes.entities) as DNode[];
    reactFlowInstance.setNodes(newNodes);

    const newEdges = activeDialogue.edges.ids.map(
      (id) => activeDialogue.edges.entities[id] as Edge,
    );
    reactFlowInstance.setEdges(newEdges);
  }, [activeDialogueId, reactFlowInstance]);

  // Fit view only when switching to a different dialogue, not on every data
  // change
  useEffect(() => {
    if (!activeDialogueId) return;
    requestAnimationFrame(() => {
      reactFlowInstance.fitView({ padding: 0.25 });
    });
  }, [activeDialogueId, reactFlowInstance]);
  const { screenToFlowPosition } = useReactFlow();
  const flowContainerRef = useRef<HTMLDivElement>(null);
  const [isPendingDialogue, startDialogueTransition] = useTransition();

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
        dActions.setNodes({
          dialogueId: activeDialogueId,
          nodes: applyNodeChanges(changes, nodes),
        }),
      );
    },
    200,
  );

  // Prevent deletion of the origin node
  const onBeforeDelete: OnBeforeDelete<DNode, Edge> = useCallback(
    async ({
      nodes: nodesToDelete,
    }: {
      nodes: DNode[];
      edges: Edge[];
    }): Promise<boolean> => {
      const hasOrigin = nodesToDelete.some((n) => n.data.isOrigin);
      if (hasOrigin) {
        showNotification({
          title: "Cannot delete",
          message: "The origin speech cannot be deleted",
          color: "orange",
        });
        return false;
      }
      return true;
    },
    [],
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
      const state = store.getState();
      const activeDialogue = dSelectors.selectDialogue(state, activeDialogueId);
      if (!activeDialogue) return;

      const edges = reactFlowInstance.getEdges();
      dispatch(
        dActions.setEdges({
          dialogueId: activeDialogue.id,
          edges: addEdge(connection, edges),
        }),
      );
    },
    [dispatch, activeDialogueId, reactFlowInstance],
  );

  const createSpeech = useCallback(
    ({
      dialogueId,
      clear = false,
      position,
      connectTo,
    }: {
      dialogueId: string | null;
      clear?: boolean;
      position?: { x: number; y: number } | undefined;
      connectTo?: {
        nodeId: string;
        handleId: string | null | undefined;
      };
    }) => {
      if (!dialogueId) return;

      if (!position) {
        const rect = flowContainerRef.current!.getBoundingClientRect();
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
          isOrigin: clear,
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
        dActions.setNodes({
          dialogueId,
          nodes: updatedNodes,
        }),
      );

      // Optionally connect the new node to an existing one
      if (connectTo) {
        const source = connectTo.nodeId;
        const target = id;

        const newEdge: Edge = {
          id: crypto.randomUUID(),
          source,
          target,
          sourceHandle: connectTo.handleId,
        };

        const updatedEdges = [...reactFlowInstance.getEdges(), newEdge];
        reactFlowInstance.setEdges(updatedEdges);
        dispatch(
          dActions.setEdges({
            dialogueId,
            edges: updatedEdges,
          }),
        );
      }

      setSelectedNodeId(id);
    },
    [dispatch, screenToFlowPosition, reactFlowInstance],
  );

  const onConnectEnd: OnConnectEnd = useCallback(
    (event, connectionState) => {
      if (!activeDialogueId || connectionState.isValid) return;

      const { clientX, clientY } =
        "changedTouches" in event ? event.changedTouches[0] : event;

      if (connectionState.fromHandle?.position === "right") {
        const connectTo = {
          nodeId: connectionState.fromNode!.id,
          handleId: connectionState.fromHandle?.id,
        };

        createSpeech({
          dialogueId: activeDialogueId,
          position: screenToFlowPosition({ x: clientX, y: clientY }),
          connectTo,
        });
      }
    },
    [activeDialogueId, createSpeech, screenToFlowPosition],
  );

  const onCreateDialogue = useCallback(
    (dialogueId: string) => {
      const state = store.getState();
      const dialogue = dSelectors.selectDialogue(state, dialogueId)!;

      createSpeech({ dialogueId, clear: true });

      // Navigate to the new dialogue URL
      const milestone = dialogue.milestoneNodeIds[0] ?? null;
      const path = createUrlPath(dialogueId, milestone);
      navigate(path);
    },
    [navigate, createSpeech],
  );

  const onSelectDialogue = useCallback(
    (value: string) => {
      // Select immediately (outside the transition) so the tree highlight
      // updates before React renders the "pending" transition state.
      // Use a ref to avoid adding `tree` as a dep (useTree returns a new
      // object reference each render, which would make this callback and
      // treeData unstable and cause an infinite update loop).
      treeSelectRef.current(value);
      startDialogueTransition(() => {
        navigate(value);
      });
    },
    [navigate],
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

    // Map from ReactFlow node UUID → human-readable milestone name
    const nodeIdToName = new Map(
      storyNodes.map((n) => [n.id, n.data.id] as [string, string]),
    );

    const tree: TreeNodeData[] = sortedSpeakers.map((obj) => {
      let getIcon: (
        isActive: boolean,
        expanded: boolean,
      ) => ReactElement = () => <></>;
      const label = obj.name;

      if (isNpcInstance(obj)) {
        const npcTemplate = tsSelectors.templateFromId(
          state,
          obj.tsObjId,
        ) as NpcTemplate;

        getIcon = (isActive: boolean, expanded: boolean) => {
          let icon: ReactNode;
          const animations = npcTemplate.animations;
          let animName: NpcRequiredAnimation = "WalkRight";
          if (expanded) animName = "WalkDown";

          if (isActive) {
            icon = (
              <TileAnimation
                frames={animations[animName].animation.frames}
                scale={2}
                bounded
              />
            );
          } else {
            const tg = animations[animName].animation.frames[0]!.tg;
            icon = <TilesetGroup scale={2} group={tg} bounded />;
          }
          return icon;
        };
      } else if (isTileGroupInstance(obj)) {
        getIcon = () => {
          const template = tsSelectors.templateFromId(
            state,
            obj.tsObjId,
          ) as TileGroupTemplate;
          return <TilesetGroup scale={2} group={template} bounded />;
        };
      }

      const objDialogues = allDialogues.filter(
        (dlg) => dlg.subjectId === obj.id,
      );

      const children = objDialogues.flatMap((dlg) => {
        if (dlg.milestoneNodeIds.length === 0) {
          return [
            {
              value: dlg.id,
              label: dlg.id,
              nodeProps: {
                dialogue: dlg,
                onSelect: onSelectDialogue,
              } satisfies DialogueNodeProps,
            },
          ];
        }

        return dlg.milestoneNodeIds.map((ms) => ({
          value: createUrlPath(dlg.id, ms),
          // Resolve the human-readable name; fall back to the raw value so
          // the "default" sentinel and any unknown IDs still display.
          label: nodeIdToName.get(ms) ?? ms,
          nodeProps: {
            dialogue: dlg,
            onSelect: onSelectDialogue,
          } satisfies DialogueNodeProps,
        }));
      });

      return {
        value: obj.id,
        label,
        nodeProps: {
          getIcon,
          objId: obj.id,
          onCreate: onCreateDialogue,
        } satisfies ObjNodeProps,
        children,
      };
    });

    return tree;
  }, [
    sortedSpeakers,
    allDialogues,
    storyNodes,
    onCreateDialogue,
    onSelectDialogue,
  ]);

  const onMilestoneChange = useCallback(
    (milestones: string[]) => {
      if (!activeDialogueId) return;

      dispatch(
        dActions.setMilestones({
          dialogueId: activeDialogueId,
          milestoneNodeIds: milestones,
        }),
      );

      const existing = new Set(activeMilestones);
      const current = new Set(milestones);
      const defaultAdded =
        !existing.has(defaultMilestone) && current.has(defaultMilestone);

      // If "default" was just added, remove it from all sibling dialogues
      if (defaultAdded) {
        dispatch(setDefaultDialogueThunk(activeDialogueId));
      }
    },
    [activeDialogueId, activeMilestones, dispatch],
  );

  const handleReflow = useCallback(async () => {
    if (!activeDialogueId) return;
    const resp = await dispatch(reflowDialogueThunk(activeDialogueId)).unwrap();

    if (!resp) return;
    const { nodes: laidOutNodes, edges: laidOutEdges } = resp;

    reactFlowInstance.setNodes(laidOutNodes);
    reactFlowInstance.setEdges(laidOutEdges);
    requestAnimationFrame(() => {
      reactFlowInstance.fitView({ duration: 250, padding: 0.25 });
    });
  }, [dispatch, reactFlowInstance, activeDialogueId]);

  const tips: ReactNode[] = useMemo(() => {
    const t: ReactNode[] = [];

    if (Object.values(activeNodes).length === 1) {
      t.push(
        "Click 'New Speech' to add a new speech node connected to this one.",
      );
      t.push(
        "If your node has responses, you can drag a connection from the right handle to create a new connected node.",
      );
    }

    if (!activeDialogueId) {
      if (speakers.length === 0) {
        t.push(
          "No named NPCs or tile groups found in the map. Go name something in the map.",
        );
      } else {
        t.push(
          "Select a dialogue from the left panel, or create a new one by clicking the '+' icon next to an NPC or tile group.",
        );
      }
    }

    return t;
  }, [activeNodes, activeDialogueId, speakers.length]);

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
              defaultNodes={Object.values(activeNodes)}
              defaultEdges={Object.values(activeEdges)}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onConnectEnd={onConnectEnd}
              onBeforeDelete={onBeforeDelete}
              selectionOnDrag={false}
              selectionMode={SelectionMode.Partial}
              fitView
            >
              <Background color="#505050ff" variant={BackgroundVariant.Dots} />
              <Controls position="top-left" showInteractive={false}></Controls>
              <Panel position="top-center">
                <Button
                  variant="filled"
                  onClick={() => createSpeech({ dialogueId: activeDialogueId })}
                  leftSection={<IconBubbleText size={20} />}
                >
                  New Speech
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

          <PanelLoader visible={isPendingDialogue} />

          {!activeDialogueId && !isPendingDialogue && (
            <Overlay color="#000" backgroundOpacity={0.65} blur={4} zIndex={10}>
              <Stack align="center" justify="center" style={{ height: "100%" }}>
                <Text size="lg" c="dimmed">
                  Please select a dialogue from the left panel.
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
          <Tip tips={tips} />

          <ScrollArea type="never" style={{ flex: 1 }}>
            <Stack p={0} gap="md">
              {activeDialogueId && (
                <>
                  <Fieldset legend="Dialogue" p="xs">
                    <Stack p={0}>
                      <MultiSelect
                        required
                        label={
                          <>
                            Milestones
                            <InfoTooltip>
                              <Typography>
                                <p>
                                  When these story milestones are triggered in
                                  the game, this dialogue becomes active for
                                  this NPC. Interacting with the NPC will then
                                  show this dialogue. You should write distinct
                                  dialogues for different story milestones to
                                  make the NPC feel more responsive to the
                                  player's progress.
                                </p>
                                <p>
                                  Usually, you only want one milestone per
                                  dialogue, but you can assign multiple
                                  milestones if you want the same dialogue to be
                                  used in different parts of the story.
                                </p>
                                <p>
                                  The "default" milestone is a special milestone
                                  that applies when no other milestones are
                                  active. You can use it to create a fallback
                                  dialogue that will always have something to
                                  say, even if you forget to assign milestones
                                  to a new dialogue.
                                </p>
                              </Typography>
                            </InfoTooltip>
                          </>
                        }
                        description="Which story milestones activate this dialogue?"
                        searchable
                        value={activeMilestones}
                        onChange={onMilestoneChange}
                        data={availableMilestones}
                        nothingFoundMessage="No milestones found"
                        disabled={!activeDialogueId}
                      />
                    </Stack>
                  </Fieldset>

                  {selectedNodeId && (
                    <SpeechEditor
                      key={selectedNodeId}
                      nodeId={selectedNodeId}
                    />
                  )}
                </>
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

function ObjLeaf({
  node,
  selected,
  elementProps,
  expanded,
  getIcon,
  onCreate,
  objId,
  tree,
}: LeafProps & ObjNodeProps) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const npcDialogues = useAppSelector((state) =>
    dSelectors.dialoguesForObj(state, objId),
  );
  const hasDefaultMilestone = npcDialogues.some((dlg) =>
    dlg.milestoneNodeIds.includes(defaultMilestone),
  );
  const activeDialogueId = useAppSelector(
    (state) => state.dialogue.activeDialogueId,
  );
  const isChildSelected = npcDialogues.some(
    (dlg) => dlg.id === activeDialogueId,
  );
  const isActive = selected || isChildSelected;
  const icon = getIcon(isActive, expanded);

  const handleAddDialogue = async (e: React.MouseEvent) => {
    e.stopPropagation();

    tree.expand(objId);

    const dId = crypto.randomUUID();
    const milestones = hasDefaultMilestone ? [] : [defaultMilestone];
    dispatch(dActions.addDialogue(createDialogue(dId, objId, milestones)));
    onCreate(dId);
  };

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      elementProps.onClick?.(e);
      navigate("/dialogues");
    },
    [elementProps, navigate],
  );

  return (
    <Box p="xs" {...elementProps} onClick={handleClick}>
      <Group gap="md">
        <Box w="15%">{icon}</Box>
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
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const activeDialogueId = useAppSelector(
    (state) => state.dialogue.activeDialogueId,
  );
  const props = node.nodeProps as DialogueNodeProps;

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      elementProps.onClick?.(e);
      props.onSelect?.(node.value);
    },
    [elementProps, props, node.value],
  );

  const dialogue = props.dialogue as Dialogue | undefined;
  const milestoneCount = dialogue?.milestoneNodeIds.length ?? 0;

  // node.value is the URL path for this leaf: "{dlgId}" or "{dlgId}/{milestoneNodeId}".
  // Since the milestone node ID is now stored in the URL, we can read it directly here.
  const milestoneNodeId = node.value.split("/")[1] as string | undefined;

  let content: React.ReactNode;
  if (milestoneCount === 0) {
    content = (
      <Group gap="xs">
        <IconAlertTriangle size={16} color="orange" />
        <Text fz="sm" variant="dimmed">
          No milestone
        </Text>
      </Group>
    );
  } else {
    content = (
      <Group gap="xs">
        <Text fz="sm">{node.label}</Text>
      </Group>
    );
  }

  const handleUnlink = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!dialogue || !milestoneNodeId) return;

    modals.openContextModal({
      modal: "confirm",
      title: "Unlink dialogue?",
      centered: true,
      withCloseButton: true,
      innerProps: {
        makeItems: () => [
          {
            ok: true,
            message: `A new copy of this dialogue will be created for the "${node.label}" milestone.`,
          },
          {
            ok: true,
            message: `The original dialogue will keep its remaining ${milestoneCount - 1} milestone(s).`,
          },
        ],
        confirmLabel: "Yes, unlink",
        msg: "Are you sure you want to unlink this milestone into its own separate dialogue?",
        onConfirm: () => {
          const newId = dispatch(
            unlinkDialogueThunk(dialogue.id, milestoneNodeId),
          );
          if (newId) {
            navigate(createUrlPath(newId, milestoneNodeId));
          }
        },
      },
    });
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!dialogue) return;

    const items: ItemStatus[] = [];

    if (milestoneCount > 1) {
      items.push({
        ok: true,
        message: `This dialogue belongs to ${milestoneCount - 1} other milestones.`,
      });
      items.push({
        ok: true,
        message:
          "Deleting it will only remove the dialogue from the current milestone.",
      });
    } else {
      items.push({
        ok: false,
        message: "This dialogue does not belong to any other milestones.",
      });
      items.push({
        ok: false,
        message: "Deleting it will remove the dialogue permanently.",
      });
    }

    modals.openContextModal({
      modal: "confirm",
      title: "Delete dialogue?",
      centered: true,
      withCloseButton: true,
      innerProps: {
        makeItems: () => items,
        confirmLabel: "Yes, delete",
        msg: "Are you sure you want to delete this dialogue? This action cannot be undone.",
        onConfirm: () => {
          if (milestoneCount > 1) {
            // Remove only this milestone from the dialogue
            dispatch(
              dActions.setMilestones({
                dialogueId: dialogue.id,
                milestoneNodeIds: dialogue.milestoneNodeIds.filter(
                  (ms) => ms !== milestoneNodeId,
                ),
              }),
            );
          } else {
            // Last (or no) milestone — remove the dialogue entirely
            dispatch(dActions.removeDialogue(dialogue.id));
          }
          if (activeDialogueId === dialogue.id) {
            navigate("/dialogues");
          }
        },
      },
    });
  };

  return (
    <Box p="xs" {...elementProps} onClick={handleClick} pl="lg">
      <Group gap="xs" wrap="nowrap">
        <Box style={{ flexGrow: 1 }}>{content}</Box>
        {selected && (
          <Tooltip label="Delete this dialogue">
            <ActionIcon variant="default" size="sm" onClick={handleDelete}>
              <IconTrash size={14} />
            </ActionIcon>
          </Tooltip>
        )}
        {selected && milestoneCount > 1 && (
          <Tooltip label="Unlink from active dialogue">
            <ActionIcon variant="default" size="sm" onClick={handleUnlink}>
              <IconUnlink size={14} />
            </ActionIcon>
          </Tooltip>
        )}
      </Group>
    </Box>
  );
}

function Leaf(payload: RenderTreeNodePayload) {
  const props = payload.node.nodeProps!;

  if (isObjNode(props)) {
    return (
      <ObjLeaf
        getIcon={props.getIcon}
        objId={props.objId}
        onCreate={props.onCreate}
        {...payload}
      />
    );
  }

  return <DialogueLeaf {...payload} />;
}
