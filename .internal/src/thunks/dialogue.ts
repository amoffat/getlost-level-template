import { defaultMilestone } from "@/constants";
import {
  actions as dActions,
  selectors as dSelectors,
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

    const charId = dialogue.initiatingChar;
    if (!charId) return;

    allDialogues
      .filter(
        (d) =>
          d.id !== dialogueId &&
          d.initiatingChar === charId &&
          d.milestoneNodeIds.includes(defaultMilestone),
      )
      .forEach((d) => {
        dispatch(
          dActions.setMilestones({
            dialogueId: d.id,
            milestoneNodeIds: d.milestoneNodeIds.filter(
              (ms) => ms !== defaultMilestone,
            ),
          }),
        );
      });
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
