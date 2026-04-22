import { defaultMilestone } from "@/constants";
import { globals as g } from "@/globals";
import { shallowEqual, useAppDispatch, useAppSelector } from "@/hooks/redux";
import {
  createDialogue,
  actions as dActions,
  selectors as dSelectors,
} from "@/slices/dialogue";
import { selectors as localeSelectors } from "@/slices/locale";
import {
  actions as mapActions,
  selectors as mapSelectors,
} from "@/slices/mapEditor";
import { selectors as tsSelectors } from "@/slices/tilesetEditor";
import { speakers as speakersSelector } from "@/store/selectors";
import { store } from "@/store/store";
import {
  reflowDialogueThunk,
  setDefaultDialogueThunk,
  unlinkDialogueThunk,
} from "@/thunks/dialogue";
import { uploadSpeakerImageThunk } from "@/thunks/speakerImage";
import type { Dialogue, DNode } from "@/types/dialogue";
import {
  isNpcInstance,
  isTileGroupInstance,
  SpeakableMapObj,
} from "@/types/map";
import type { NpcRequiredAnimation, NpcTemplate } from "@/types/npc";
import { TileGroupTemplate } from "@/types/tilegroup";
import { createUrlPath } from "@/utils/dialogue";
import { showNotification } from "@/utils/notifications";
import { Split } from "@gfazioli/mantine-split-pane";
import {
  ActionIcon,
  Alert,
  Box,
  Button,
  Fieldset,
  Flex,
  Group,
  Image,
  Menu,
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
  IconInfoCircle,
  IconPhoto,
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
  const {
    dlgid: dlgId,
    milestone: msId,
    nodeid: nodeIdParam,
  } = useParams<{
    dlgid?: string;
    milestone?: string;
    nodeid?: string;
  }>();
  const location = useLocation();
  const speakers = useAppSelector(speakersSelector);
  const availableMilestones = useAppSelector(dSelectors.availableMilestones);
  const allDialogues = useAppSelector(dSelectors.allDialogues);
  const storyNodes = useAppSelector((state) => state.story.nodes);
  const { activeMilestones, activeNodes, activeEdges } = useAppSelector(
    (state) => ({
      activeMilestones: dSelectors.activeMilestones(state),
      activeNodes: dSelectors.activeNodes(state),
      activeEdges: dSelectors.activeEdges(state),
    }),
    shallowEqual,
  );
  const activeDialogueId = useAppSelector(
    (state) => state.dialogue.activeDialogueId,
  );
  const currentLocale = useAppSelector(localeSelectors.activeLocale);
  const tree = useTree();
  const treeSelectRef = useRef(tree.select);
  treeSelectRef.current = tree.select;
  const navigate = useNavigate();

  const sortedSpeakers = useMemo(() => {
    return speakers.sort((a, b) => a[0].localeCompare(b[0]));
  }, [speakers]);

  // Sync activeDialogueId from URL parameter
  useEffect(() => {
    if (!dlgId) {
      // Only clear if we're still on the dialogue page
      const samePage = location.pathname.startsWith("/dialogues");
      if (samePage) {
        dispatch(dActions.setActiveDialogue(null));
      }

      reactFlowInstance.setNodes([]);
      reactFlowInstance.setEdges([]);
      return;
    }

    const state = store.getState();
    const activeDialogue = dSelectors.selectDialogue(state, dlgId);
    if (!activeDialogue) {
      navigate("/dialogues");
      return;
    }

    // Load our nodes and edges into react flow. Strip `selected` so that the
    // URL param effect (below) is the sole source of truth for selection.
    // Leaving stale `selected: true` values in the store would cause
    // reactFlowInstance.setNodes to re-select a node, firing
    // useOnSelectionChange and navigating back to the node URL.
    const newNodes = (
      Object.values(activeDialogue.nodes.entities) as DNode[]
    ).map((n) => ({ ...n, selected: false }));
    reactFlowInstance.setNodes(newNodes);

    const newEdges = activeDialogue.edges.ids.map(
      (id) => activeDialogue.edges.entities[id] as Edge,
    );
    reactFlowInstance.setEdges(newEdges);

    // If the active selected dialogue and node doesn't match the url, update
    // it.
    if (
      dlgId !== state.dialogue.activeDialogueId ||
      !tree.selectedState.includes(
        createUrlPath({ id: dlgId, milestone: msId }),
      )
    ) {
      dispatch(dActions.setActiveDialogue(dlgId));
      tree.select(createUrlPath({ id: dlgId, milestone: msId }));

      if (nodeIdParam) {
        requestAnimationFrame(() => {
          reactFlowInstance.fitView({
            nodes: [{ id: nodeIdParam }],
            padding: 0.5,
            maxZoom: 1,
          });
        });
      } else {
        requestAnimationFrame(() => {
          reactFlowInstance.fitView({ padding: 0.25 });
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dlgId, msId, dispatch, navigate]);

  // Sync node selection from URL parameter. Depends on activeDialogueId so
  // that it runs after effect #2 has loaded the nodes into ReactFlow.
  useEffect(() => {
    if (!nodeIdParam || !activeDialogueId) {
      if (!nodeIdParam) setSelectedNodeId(null);
      return;
    }
    const nodes = reactFlowInstance.getNodes();
    if (!nodes.some((n) => n.id === nodeIdParam)) return;
    reactFlowInstance.setNodes(
      nodes.map((n) => ({ ...n, selected: n.id === nodeIdParam })),
    );
    setSelectedNodeId(nodeIdParam);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeIdParam, activeDialogueId]);

  const { screenToFlowPosition } = useReactFlow();
  const flowContainerRef = useRef<HTMLDivElement>(null);
  const [isPendingDialogue, startDialogueTransition] = useTransition();

  // Track the currently selected node for the right-pane editor
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const selectedNode = useAppSelector((state) =>
    selectedNodeId ? dSelectors.selectNode(state, selectedNodeId) : null,
  );

  useOnSelectionChange({
    onChange: ({ nodes: selectedNodes }) => {
      if (selectedNodes.length === 1) {
        const nodeId = selectedNodes[0].id;
        setSelectedNodeId(nodeId);
        if (dlgId && msId) {
          navigate(createUrlPath({ id: dlgId, milestone: msId, nodeId }), {
            replace: true,
          });
        }
      } else {
        setSelectedNodeId(null);
        if (dlgId && msId) {
          navigate(createUrlPath({ id: dlgId, milestone: msId }), {
            replace: true,
          });
        }
      }
    },
  });

  const onNodesChange: OnNodesChange<DNode> = useDebouncedCallback(
    (changes) => {
      if (!dlgId) return;
      const nodes = reactFlowInstance.getNodes();
      dispatch(
        dActions.setNodes({
          dialogueId: dlgId,
          nodes: applyNodeChanges(changes, nodes),
        }),
      );
    },
    200,
  );

  // Prevent deletion of the origin node; clean up locale entries for deleted nodes
  const onBeforeDelete: OnBeforeDelete<DNode, Edge> = useCallback(
    async ({
      nodes: nodesToDelete,
    }: {
      nodes: DNode[];
      edges: Edge[];
    }): Promise<boolean> => {
      // ReactFlow node state can be stale (e.g. data.contentKey, data.choices
      // are updated via updateNodeData which only writes to Redux). Map each
      // ReactFlow node to its authoritative Redux counterpart before acting.
      const authoritativeNodes = nodesToDelete
        .map((n) => activeNodes[n.id])
        .filter((n): n is DNode => n !== undefined);

      const hasOrigin = authoritativeNodes.some((n) => n.data.isOrigin);
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
    [activeNodes],
  );

  const onEdgesChange: OnEdgesChange = useDebouncedCallback((changes) => {
    if (!dlgId) return;
    const edges = reactFlowInstance.getEdges();
    dispatch(
      dActions.setEdges({
        dialogueId: dlgId,
        edges: applyEdgeChanges(changes, edges),
      }),
    );
  }, 200);

  const onConnect: OnConnect = useCallback(
    (connection) => {
      if (!dlgId) return;
      const state = store.getState();
      const activeDialogue = dSelectors.selectDialogue(state, dlgId);
      if (!activeDialogue) return;

      const edges = reactFlowInstance.getEdges();
      dispatch(
        dActions.setEdges({
          dialogueId: activeDialogue.id,
          edges: addEdge(connection, edges),
        }),
      );
    },
    [dispatch, dlgId, reactFlowInstance],
  );

  const createSpeech = useCallback(
    ({
      dialogueId,
      clear = false,
      position,
      connectTo,
    }: {
      dialogueId: string | undefined;
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
          speakerNameKey: undefined,
          contentKey: undefined,
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
      if (!dlgId || connectionState.isValid) return;

      const { clientX, clientY } =
        "changedTouches" in event ? event.changedTouches[0] : event;

      if (connectionState.fromHandle?.position === "right") {
        const connectTo = {
          nodeId: connectionState.fromNode!.id,
          handleId: connectionState.fromHandle?.id,
        };

        createSpeech({
          dialogueId: dlgId,
          position: screenToFlowPosition({ x: clientX, y: clientY }),
          connectTo,
        });
      }
    },
    [dlgId, createSpeech, screenToFlowPosition],
  );

  const onCreateDialogue = useCallback(
    (dialogueId: string) => {
      const state = store.getState();
      const dialogue = dSelectors.selectDialogue(state, dialogueId)!;

      createSpeech({ dialogueId, clear: true });

      // Navigate to the new dialogue URL
      const milestone = dialogue.milestoneNodeIds[0] ?? null;
      const path = createUrlPath({ id: dialogueId, milestone });
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

    const tree: TreeNodeData[] = sortedSpeakers.map(([label, obj]) => {
      let getIcon: (
        isActive: boolean,
        expanded: boolean,
      ) => ReactElement = () => <></>;

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
              value: createUrlPath({ id: dlg.id }),
              label: dlg.id,
              nodeProps: {
                dialogue: dlg,
                onSelect: onSelectDialogue,
              } satisfies DialogueNodeProps,
            },
          ];
        }

        return dlg.milestoneNodeIds.map((ms) => ({
          value: createUrlPath({ id: dlg.id, milestone: ms }),
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
    storyNodes,
    sortedSpeakers,
    allDialogues,
    onCreateDialogue,
    onSelectDialogue,
  ]);

  const onMilestoneChange = useCallback(
    (milestones: string[]) => {
      if (!dlgId) return;

      dispatch(
        dActions.setMilestones({
          dialogueId: dlgId,
          milestoneNodeIds: milestones,
        }),
      );

      const existing = new Set(activeMilestones);
      const current = new Set(milestones);
      const defaultAdded =
        !existing.has(defaultMilestone) && current.has(defaultMilestone);

      // If "default" was just added, remove it from all sibling dialogues
      if (defaultAdded) {
        dispatch(setDefaultDialogueThunk(dlgId));
      }
    },
    [dlgId, activeMilestones, dispatch],
  );

  const handleReflow = useCallback(async () => {
    if (!dlgId) return;
    const resp = await dispatch(reflowDialogueThunk(dlgId)).unwrap();

    if (!resp) return;
    const { nodes: laidOutNodes, edges: laidOutEdges } = resp;

    reactFlowInstance.setNodes(laidOutNodes);
    reactFlowInstance.setEdges(laidOutEdges);
    requestAnimationFrame(() => {
      reactFlowInstance.fitView({ duration: 250, padding: 0.25 });
    });
  }, [dispatch, reactFlowInstance, dlgId]);

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

    if (!dlgId && speakers.length > 0) {
      t.push(
        "Select a dialogue from the left panel, or create a new dialogue by clicking the '+' icon in the left panel.",
      );
    }

    return t;
  }, [activeNodes, dlgId, speakers.length]);

  return (
    <Split h="100dvh" style={{ flex: 1 }}>
      {/* Left panel */}
      <Split.Pane
        initialWidth="15%"
        minWidth={250}
        maxWidth="45%"
        onResizeEnd={handlePaneResize}
      >
        <Stack h="100%" style={{ overflow: "hidden" }} p={0} pb="xl">
          <ScrollArea type="never" style={{ flex: 1 }}>
            <Stack p={0} pb="xl">
              {treeData.length === 0 && (
                <Box p="xs">
                  <Alert
                    title="No dialogues"
                    variant="light"
                    icon={<IconInfoCircle />}
                  >
                    There are no objects in the scene that the player can talk
                    with.
                  </Alert>
                </Box>
              )}
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
                <Group gap="xs">
                  <Button
                    variant="filled"
                    onClick={() => createSpeech({ dialogueId: dlgId })}
                    leftSection={<IconBubbleText size={20} />}
                  >
                    New Speech
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleReflow}
                    leftSection={<IconSitemap size={20} />}
                  >
                    Organize
                  </Button>
                </Group>
              </Panel>
            </ReactFlow>
          </div>

          <PanelLoader visible={isPendingDialogue} />

          {!dlgId && !isPendingDialogue && (
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
        <Stack h="100%" style={{ overflow: "hidden" }} pb="xl">
          <Tip tips={tips} />

          <ScrollArea type="never" style={{ flex: 1 }}>
            <Stack p={0} gap="md" pb="xl">
              {dlgId && (
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
                        disabled={!dlgId}
                      />
                    </Stack>
                  </Fieldset>

                  {selectedNodeId && selectedNode && (
                    <SpeechEditor
                      key={selectedNodeId}
                      currentLocale={currentLocale}
                      node={selectedNode}
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
  expanded,
  elementProps,
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

  const obj = useAppSelector((state) =>
    mapSelectors.selectObject(state, objId),
  ) as SpeakableMapObj;
  const speakerImageUrl = obj.speakerImageId
    ? g.speakerImageObjectUrlCache.get(obj.speakerImageId)
    : undefined;

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddDialogue = async (e: React.MouseEvent) => {
    e.stopPropagation();

    tree.expand(objId);

    const dId = crypto.randomUUID();
    const milestones = hasDefaultMilestone ? [] : [defaultMilestone];
    dispatch(dActions.addDialogue(createDialogue(dId, objId, milestones)));
    onCreate(dId);
  };

  const handleUploadSpeakerImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset the input so the same file can be re-selected
    e.target.value = "";
    await dispatch(uploadSpeakerImageThunk({ objId, file }));
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
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
      <Group gap="xs" wrap="nowrap">
        <Box w="20%">
          {speakerImageUrl ? (
            <Image
              src={speakerImageUrl}
              w={38}
              h={38}
              fit="cover"
              style={{
                imageRendering: "pixelated",
              }}
            />
          ) : (
            <Box w={50} h={50}>
              {icon}
            </Box>
          )}
        </Box>
        <Text fz="sm">{node.label}</Text>
        <Box style={{ flexGrow: 1 }} />

        <ActionIcon.Group>
          {obj.speakerImageId ? (
            <Menu withinPortal position="bottom-end">
              <Tooltip label="Change speaker image">
                <Menu.Target>
                  <ActionIcon
                    variant="default"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <IconPhoto size={16} />
                  </ActionIcon>
                </Menu.Target>
              </Tooltip>
              <Menu.Dropdown>
                <Menu.Item
                  leftSection={<IconPhoto size={14} />}
                  onClick={handleUploadSpeakerImage}
                >
                  Replace image
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconTrash size={14} />}
                  color="red"
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch(
                      mapActions.updateOne({
                        id: objId,
                        changes: { speakerImageId: null },
                      }),
                    );
                  }}
                >
                  Remove image
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          ) : (
            <Tooltip label="Upload speaker image">
              <ActionIcon variant="default" onClick={handleUploadSpeakerImage}>
                <IconPhoto size={16} />
              </ActionIcon>
            </Tooltip>
          )}
          <Tooltip label="Add new dialogue for this NPC">
            <ActionIcon variant="default" onClick={handleAddDialogue}>
              <IconPlus size={16} />
            </ActionIcon>
          </Tooltip>
        </ActionIcon.Group>
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

  // node.value is the URL path for this leaf: "{dlgId}" or "{dlgId}/nodes/{milestoneNodeId}".
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
            navigate(createUrlPath({ id: newId, milestone: milestoneNodeId }));
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
            // Last (or no) milestone — remove the dialogue entirely.
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
