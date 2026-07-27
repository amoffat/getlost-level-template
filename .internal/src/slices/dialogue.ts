import { mainLocale, playerParticipantId } from "@/constants";
import type { RootState } from "@/store/store";
import {
  createEntityAdapter,
  createSelector,
  createSlice,
  EntityState,
  PayloadAction,
} from "@reduxjs/toolkit";
import { Edge } from "@xyflow/react";
import type { Dialogue, DNode } from "../types/dialogue";
import { participantsOf } from "../utils/dialogue";

// Entity adapters
export const dialogueAdapter = createEntityAdapter<Dialogue>();
export const nodeAdapter = createEntityAdapter<DNode>();
export const edgeAdapter = createEntityAdapter<Edge>();

interface DialogueState {
  dialogues: EntityState<Dialogue, string>;
  activeDialogueId: string | null;
}

const createDlgSelector = createSelector.withTypes<DialogueState>();

const activeDialogue = createDlgSelector(
  [(state) => state.activeDialogueId, (state) => state.dialogues],
  (id, dialogues): Dialogue | null => {
    return id ? (dialogues.entities[id] ?? null) : null;
  },
);

export const slice = createSlice({
  name: "dialogue",
  initialState: {
    dialogues: dialogueAdapter.getInitialState(),
    activeDialogueId: null,
  } as DialogueState,

  reducers: {
    addDialogue(state, action: PayloadAction<Dialogue>) {
      dialogueAdapter.setOne(state.dialogues, action.payload);
    },
    setDialogues(state, action: PayloadAction<Dialogue[]>) {
      dialogueAdapter.setAll(state.dialogues, action.payload);
    },
    removeDialogue(state, action: PayloadAction<string>) {
      const dlgId = action.payload;
      dialogueAdapter.removeOne(state.dialogues, dlgId);
      if (state.activeDialogueId === dlgId) {
        state.activeDialogueId = null;
      }
    },
    setActiveDialogue(state, action: PayloadAction<string | null>) {
      state.activeDialogueId = action.payload;
    },
    setSubjectId(
      state,
      action: PayloadAction<{ dialogueId: string; subjectId: string }>,
    ) {
      const { dialogueId, subjectId } = action.payload;
      const dlg = state.dialogues.entities[dialogueId];
      if (dlg) {
        dlg.initiatingChar = subjectId;
      }
    },
    addNode(state, action: PayloadAction<{ dialogueId: string; node: DNode }>) {
      const { dialogueId, node } = action.payload;
      const dlg = state.dialogues.entities[dialogueId];
      if (!dlg) return;
      nodeAdapter.setOne(dlg.nodes, node);
    },
    // Removes a node and any edge that would dangle from it. Used for redo of a
    // node deletion (and as the inverse of addNode).
    removeNode(
      state,
      action: PayloadAction<{ dialogueId: string; nodeId: string }>,
    ) {
      const { dialogueId, nodeId } = action.payload;
      const dlg = state.dialogues.entities[dialogueId];
      if (!dlg) return;
      nodeAdapter.removeOne(dlg.nodes, nodeId);
      const danglingEdgeIds = dlg.edges.ids.filter((id) => {
        const edge = dlg.edges.entities[id];
        return edge && (edge.source === nodeId || edge.target === nodeId);
      });
      edgeAdapter.removeMany(dlg.edges, danglingEdgeIds);
    },
    // Syncing from React Flow is a bit more complex than just replacing the
    // nodes, because we want to preserve the data of the nodes. This is because
    // the redux store has the authoritative data, and RF just manages the
    // positions, sizes, connections, etc.
    setNodes(
      state,
      action: PayloadAction<{ dialogueId: string; nodes: DNode[] }>,
    ) {
      const { dialogueId, nodes } = action.payload;

      const uniqueNodes = new Map(nodes.map((node) => [node.id, node]));

      const dlg = state.dialogues.entities[dialogueId];
      if (!dlg) return;

      const preserved = Array.from(uniqueNodes.values()).map((node) => {
        const oldNode = dlg.nodes.entities[node.id];
        if (oldNode) {
          return { ...node, data: oldNode.data };
        }
        return node;
      });
      nodeAdapter.setAll(dlg.nodes, preserved);
    },
    setEdges(
      state,
      action: PayloadAction<{ dialogueId: string; edges: Edge[] }>,
    ) {
      const { dialogueId, edges } = action.payload;
      const dlg = state.dialogues.entities[dialogueId];
      if (!dlg) return;
      edgeAdapter.setAll(dlg.edges, edges);
    },
    updateNodeData(
      state,
      action: PayloadAction<{
        dialogueId: string;
        id: string;
        data: Partial<DNode["data"]>;
      }>,
    ) {
      const { dialogueId, id, data } = action.payload;
      const dlg = state.dialogues.entities[dialogueId];
      if (!dlg) return;
      const node = dlg.nodes.entities[id];
      if (node) {
        node.data = { ...node.data, ...data };
      }
    },
    setMilestones(
      state,
      action: PayloadAction<{ dialogueId: string; milestoneNodeIds: string[] }>,
    ) {
      const { dialogueId, milestoneNodeIds } = action.payload;
      const dlg = state.dialogues.entities[dialogueId];
      if (dlg) {
        dlg.milestoneNodeIds = milestoneNodeIds;
      }
    },
    setExactMilestoneOnly(
      state,
      action: PayloadAction<{
        dialogueId: string;
        exactMilestoneOnly: boolean;
      }>,
    ) {
      const { dialogueId, exactMilestoneOnly } = action.payload;
      const dlg = state.dialogues.entities[dialogueId];
      if (dlg) {
        dlg.exactMilestoneOnly = exactMilestoneOnly;
      }
    },
  },
  extraReducers: (builder) => {
    // Also listen for a story/resetStory thunk, and reset our dialogue nodes
    builder.addCase("story/resetStory/fulfilled", (state) => {
      state.dialogues = dialogueAdapter.getInitialState();
      state.activeDialogueId = null;
      state.dialogues.ids = [];
      state.dialogues.entities = {};
    });

    // Listen for NPC deletions from mapEditor
    builder.addMatcher(
      (action): action is PayloadAction<string> => {
        return (
          action.type === "mapEditor/removeOne" &&
          typeof action.payload === "string"
        );
      },
      (state, action) => {
        const removedId = action.payload;
        // Set subjectId to null for all dialogues that reference this NPC
        for (const dlgId of state.dialogues.ids) {
          const dlg = state.dialogues.entities[dlgId];
          if (dlg && dlg.initiatingChar === removedId) {
            dlg.initiatingChar = playerParticipantId;
          }
        }
      },
    );
    builder.addMatcher(
      (action): action is PayloadAction<string[]> => {
        return (
          action.type === "mapEditor/removeMany" &&
          Array.isArray(action.payload)
        );
      },
      (state, action) => {
        const removedIds = new Set(action.payload);
        // Set subjectId to null for all dialogues that reference deleted NPCs
        for (const dlgId of state.dialogues.ids) {
          const dlg = state.dialogues.entities[dlgId];
          if (
            dlg &&
            dlg.initiatingChar !== null &&
            removedIds.has(dlg.initiatingChar)
          ) {
            dlg.initiatingChar = playerParticipantId;
          }
        }
      },
    );
  },
  selectors: {
    activeDialogue,
    selectDialogue: createDlgSelector(
      [(state, dlgId: string) => state.dialogues.entities[dlgId]],
      (dlg): Dialogue | null => dlg ?? null,
    ),
    selectNode: createDlgSelector(
      [
        (state) => state.dialogues,
        (state) => state.activeDialogueId,
        (_: DialogueState, nodeId: string) => nodeId,
      ],
      (dialogues, activeId, nodeId): DNode | null => {
        if (!activeId) return null;
        const dlg = dialogues.entities[activeId];
        if (!dlg) return null;
        return dlg.nodes.entities[nodeId] ?? null;
      },
    ),
    activeNodes: createDlgSelector(
      [activeDialogue],
      (dlg): Record<string, DNode> => {
        if (!dlg) return {};
        return dlg.nodes.entities as Record<string, DNode>;
      },
    ),
    activeEdges: createDlgSelector([activeDialogue], (dlg): Edge[] => {
      if (!dlg) return [];
      return dlg.edges.ids.map((id) => dlg.edges.entities[id] as Edge);
    }),
    activeMilestones: createDlgSelector(
      [activeDialogue],
      (dlg): string[] => dlg?.milestoneNodeIds ?? [],
    ),
    activeExactMilestoneOnly: createDlgSelector(
      [activeDialogue],
      (dlg): boolean => dlg?.exactMilestoneOnly ?? false,
    ),
    allDialogues: createDlgSelector(
      [(state) => state.dialogues],
      (dialogues): Dialogue[] =>
        dialogues.ids.map((id) => dialogues.entities[id] as Dialogue),
    ),
    dialoguesForObj: createDlgSelector(
      [(state) => state.dialogues, (_: DialogueState, objId: string) => objId],
      (dialogues, objId): Dialogue[] =>
        (dialogues.ids as string[])
          .map((id) => dialogues.entities[id] as Dialogue)
          .filter((dlg) => dlg.initiatingChar === objId),
    ),
    // Dialogues in which the given participant (a SpeakableMapObj id or the
    // player sentinel) speaks or listens anywhere. Drives the tree listing and
    // the character-row "child selected" highlight.
    dialoguesWithParticipant: createDlgSelector(
      [
        (state) => state.dialogues,
        (_: DialogueState, participantId: string) => participantId,
      ],
      (dialogues, participantId): Dialogue[] =>
        (dialogues.ids as string[])
          .map((id) => dialogues.entities[id] as Dialogue)
          .filter((dlg) => participantsOf(dlg).has(participantId)),
    ),
    unassignedDialogues: createDlgSelector(
      [(state) => state.dialogues],
      (dialogues): Dialogue[] =>
        (dialogues.ids as string[])
          .map((id) => dialogues.entities[id] as Dialogue)
          .filter((dlg) => dlg.initiatingChar === null),
    ),
  },
});

/**
 * Returns milestone items available for the active dialogue as
 * `{ value, label }` pairs where `value` is the stable ReactFlow node UUID
 * (or the special "default" sentinel) and `label` is the human-readable
 * milestone name.
 *
 * Using the node UUID as the value means that renaming a milestone does not
 * invalidate existing dialogue linkages.
 *
 * "Available" = all story milestones minus those already claimed by
 * *other* dialogues belonging to the same NPC.
 */
const availableMilestones = createSelector(
  [
    (state: RootState) => state.story.nodes,
    (state: RootState) => state.dialogue.activeDialogueId,
    (state: RootState) => state.dialogue.dialogues,
  ],
  (
    storyNodes,
    activeDialogueId,
    dialogues,
  ): { value: string; label: string }[] => {
    const allItems: { value: string; label: string }[] = [
      ...storyNodes.map((n) => ({ value: n.id, label: n.data.id })),
    ];

    if (!activeDialogueId) return allItems;

    const activeDlg = dialogues.entities[activeDialogueId];
    if (!activeDlg?.initiatingChar) return allItems;

    const npcId = activeDlg.initiatingChar;

    // Collect milestones used by sibling dialogues (same NPC, different dialogue)
    const usedByOthers = new Set<string>();
    for (const id of dialogues.ids) {
      if (id === activeDialogueId) continue;
      const dlg = dialogues.entities[id as string];
      if (dlg && dlg.initiatingChar === npcId) {
        for (const ms of dlg.milestoneNodeIds) {
          usedByOthers.add(ms);
        }
      }
    }

    return allItems.filter((item) => !usedByOthers.has(item.value));
  },
);

/**
 * Returns all story milestones as selectable options.
 * Unlike availableMilestones, this is not filtered by sibling dialogue usage —
 * it is used for per-node activation milestone selection.
 */
const allMilestones = createSelector(
  [(state: RootState) => state.story.nodes],
  (storyNodes): { value: string; label: string }[] =>
    storyNodes.map((n) => ({ value: n.id, label: n.data.id })),
);

/**
 * Returns the dialogues for a given milestone.
 */
const dialogueForMilestone = createSelector(
  [
    (state: RootState) => state.dialogue.dialogues,
    (_: RootState, milestoneId: string) => milestoneId,
  ],
  (dialogues, milestoneId): Dialogue[] => {
    const msDialogues: Dialogue[] = [];
    for (const id of dialogues.ids) {
      const dlg = dialogues.entities[id as string];
      // Multi-participant dialogues have no single subject (subjectId is null);
      // they're matched purely by their milestone linkage.
      if (dlg && dlg.milestoneNodeIds.includes(milestoneId)) {
        msDialogues.push(dlg);
      }
    }
    return msDialogues;
  },
);

/**
 * Returns the text of the first (origin) node in the given dialogue, resolved
 * against the currently active story locale. Falls back to the default locale,
 * and then to "..." if no text is found.
 */
const selectFirstNodeText = createSelector(
  [
    (state: RootState) => state.dialogue.dialogues,
    (state: RootState) => state.locale,
    (_: RootState, dialogueId: string) => dialogueId,
  ],
  (dialogues, locale, dialogueId): string => {
    const dlg = dialogues.entities[dialogueId];
    if (!dlg) return "...";

    const originNode = (
      Object.values(dlg.nodes.entities) as (DNode | undefined)[]
    ).find((n) => n?.data.isOrigin);
    if (!originNode) return "...";

    const contentKey = originNode.data.contentKey;
    if (!contentKey) return "...";

    const activeLocale = locale.activeLocale;
    const activeText = locale.entries[activeLocale]?.entities[contentKey]?.v;
    if (activeText) return activeText;

    const defaultText = locale.entries[mainLocale]?.entities[contentKey]?.v;
    return defaultText ?? "...";
  },
);

export const selectors = {
  ...slice.selectors,
  availableMilestones,
  allMilestones,
  dialogueForMilestone,
  selectFirstNodeText,
};
export const actions = slice.actions;

/** Helper to create a new empty Dialogue entity. */
export function createDialogue({
  id,
  initiatingChar,
  milestoneNodeIds = [],
  exactMilestoneOnly = false,
}: {
  id: string;
  initiatingChar: string;
  milestoneNodeIds: string[];
  exactMilestoneOnly?: boolean;
}): Dialogue {
  return {
    id,
    initiatingChar,
    nodes: nodeAdapter.getInitialState(),
    edges: edgeAdapter.getInitialState(),
    milestoneNodeIds,
    exactMilestoneOnly,
  };
}
