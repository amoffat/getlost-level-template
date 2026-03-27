import { defaultMilestone } from "@/constants";
import {
  createDialogue,
  actions as dActions,
  selectors as dSelectors,
  edgeAdapter,
  nodeAdapter,
} from "@/slices/dialogue";
import type { AppDispatch, RootState } from "@/store/store";
import type { DNode } from "@/types/dialogue";
import { layoutGraph } from "@/utils/story";
import { createAsyncThunk } from "@reduxjs/toolkit";
import type { Edge } from "@xyflow/react";

/**
 * When a dialogue is designated as the "default" for its NPC, this thunk
 * removes the "default" milestone from every other dialogue that belongs to
 * the same NPC so that only one dialogue can hold the default at a time.
 */
export const setDefaultDialogueThunk =
  (dialogueId: string) =>
  (dispatch: AppDispatch, getState: () => RootState) => {
    const state = getState();
    const allDialogues = dSelectors.allDialogues(state);
    const dialogue = allDialogues.find((d) => d.id === dialogueId);
    if (!dialogue) return;

    const npcId = dialogue.subjectId;
    if (!npcId) return;

    allDialogues
      .filter(
        (d) =>
          d.id !== dialogueId &&
          d.subjectId === npcId &&
          d.milestoneNodeIds.includes(defaultMilestone),
      )
      .forEach((d) => {
        dispatch(
          dActions.setMilestones({
            dialogueId: d.id,
            milestoneNodeIds: d.milestoneNodeIds.filter((ms) => ms !== defaultMilestone),
          }),
        );
      });
  };

/**
 * Unlinks a single milestone from a shared dialogue by creating a brand new
 * copy of the dialogue (same nodes, edges, and subjectId) that carries only the
 * given milestone. The milestone is then removed from the original dialogue so
 * every milestone independently owns its own copy.
 *
 * Returns the ID of the newly created dialogue copy, or null if the source
 * dialogue was not found.
 */
export const unlinkDialogueThunk =
  (dialogueId: string, milestone: string) =>
  (dispatch: AppDispatch, getState: () => RootState): string | null => {
    const state = getState();
    const original = dSelectors.selectDialogue(state, dialogueId);
    if (!original) return null;

    const newId = crypto.randomUUID();
    const newDialogue = createDialogue(newId, original.subjectId, [milestone]);

    // Deep-copy nodes from the original dialogue
    const nodesList = original.nodes.ids.map(
      (id) => original.nodes.entities[id] as DNode,
    );
    newDialogue.nodes = nodeAdapter.setAll(newDialogue.nodes, nodesList);

    // Deep-copy edges from the original dialogue
    const edgesList = original.edges.ids.map(
      (id) => original.edges.entities[id] as Edge,
    );
    newDialogue.edges = edgeAdapter.setAll(newDialogue.edges, edgesList);

    dispatch(dActions.addDialogue(newDialogue));

    // Remove the unlinked milestone from the original dialogue
    dispatch(
      dActions.setMilestones({
        dialogueId: original.id,
        milestoneNodeIds: original.milestoneNodeIds.filter((ms) => ms !== milestone),
      }),
    );

    return newId;
  };

export const reflowDialogueThunk = createAsyncThunk(
  "dialogue/reflow",
  async (
    dialogueId: string,
    { getState, dispatch },
  ): Promise<{ nodes: DNode[]; edges: Edge[] } | undefined> => {
    const state = getState() as RootState;
    const activeDialogueId = state.dialogue.activeDialogueId;
    if (!activeDialogueId) return;

    const dialogue = dSelectors.selectDialogue(state, activeDialogueId);
    if (!dialogue) return;

    const { nodes: laidOutNodes, edges: laidOutEdges } = await layoutGraph(
      Object.values(dialogue.nodes.entities),
      Object.values(dialogue.edges.entities),
      { rankdir: "RIGHT" },
    );
    dispatch(dActions.setNodes({ dialogueId, nodes: laidOutNodes }));
    dispatch(dActions.setEdges({ dialogueId, edges: laidOutEdges }));
    return { nodes: laidOutNodes, edges: laidOutEdges };
  },
);
