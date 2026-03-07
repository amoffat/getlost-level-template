import { defaultMilestone } from "@/constants";
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
      action: PayloadAction<{ dialogueId: string; subjectId: string | null }>,
    ) {
      const { dialogueId, subjectId } = action.payload;
      const dlg = state.dialogues.entities[dialogueId];
      if (dlg) {
        dlg.subjectId = subjectId;
      }
    },
    addNode(state, action: PayloadAction<{ dialogueId: string; node: DNode }>) {
      const { dialogueId, node } = action.payload;
      const dlg = state.dialogues.entities[dialogueId];
      if (!dlg) return;
      nodeAdapter.setOne(dlg.nodes, node);
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
      const dlg = state.dialogues.entities[dialogueId];
      if (!dlg) return;

      const preserved = nodes.map((node) => {
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
    setNodeData(
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
      action: PayloadAction<{ dialogueId: string; milestones: string[] }>,
    ) {
      const { dialogueId, milestones } = action.payload;
      const dlg = state.dialogues.entities[dialogueId];
      if (dlg) {
        dlg.milestones = milestones;
      }
    },
  },
  extraReducers: (builder) => {
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
          if (dlg && dlg.subjectId === removedId) {
            dlg.subjectId = null;
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
          if (dlg && dlg.subjectId !== null && removedIds.has(dlg.subjectId)) {
            dlg.subjectId = null;
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
      (dlg): string[] => dlg?.milestones ?? [],
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
          .filter((dlg) => dlg.subjectId === objId),
    ),
    unassignedDialogues: createDlgSelector(
      [(state) => state.dialogues],
      (dialogues): Dialogue[] =>
        (dialogues.ids as string[])
          .map((id) => dialogues.entities[id] as Dialogue)
          .filter((dlg) => dlg.subjectId === null),
    ),
  },
});

/**
 * Returns milestone IDs available for the active dialogue.
 * "Available" = all story milestones minus those already claimed by
 * *other* dialogues belonging to the same NPC.
 */
const availableMilestones = createSelector(
  [
    (state: RootState) => state.story.nodes,
    (state: RootState) => state.dialogue.activeDialogueId,
    (state: RootState) => state.dialogue.dialogues,
  ],
  (storyNodes, activeDialogueId, dialogues): string[] => {
    const allIds = [defaultMilestone, ...storyNodes.map((n) => n.data.id)];

    if (!activeDialogueId) return allIds;

    const activeDlg = dialogues.entities[activeDialogueId];
    if (!activeDlg?.subjectId) return allIds;

    const npcId = activeDlg.subjectId;

    // Collect milestones used by sibling dialogues (same NPC, different dialogue)
    const usedByOthers = new Set<string>();
    for (const id of dialogues.ids) {
      if (id === activeDialogueId) continue;
      const dlg = dialogues.entities[id as string];
      if (dlg && dlg.subjectId === npcId) {
        for (const ms of dlg.milestones) {
          usedByOthers.add(ms);
        }
      }
    }

    return allIds.filter((id) => !usedByOthers.has(id));
  },
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
      if (
        dlg &&
        dlg.subjectId !== null &&
        dlg.milestones.includes(milestoneId)
      ) {
        msDialogues.push(dlg);
      }
    }
    return msDialogues;
  },
);

export const selectors = {
  ...slice.selectors,
  availableMilestones,
  dialogueForMilestone,
};
export const actions = slice.actions;

/** Helper to create a new empty Dialogue entity. */
export function createDialogue(
  id: string,
  subjectId: string | null = null,
  milestones: string[] = [],
): Dialogue {
  return {
    id,
    subjectId,
    nodes: nodeAdapter.getInitialState(),
    edges: edgeAdapter.getInitialState(),
    milestones,
  };
}
