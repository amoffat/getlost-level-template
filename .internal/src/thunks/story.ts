import { loadStory } from "@/persist/story/api";
import { actions as dActions } from "@/slices/dialogue";
import {
  resetInstance,
  setEdges,
  setError,
  setLoading,
  setNodes,
  StoryEdge,
  StoryNode,
} from "@/slices/story";
import type { RootState } from "@/store/store";
import { layoutGraph } from "@/utils/story";
import { createAsyncThunk } from "@reduxjs/toolkit";

export const loadStoryThunk = createAsyncThunk(
  "story/loadStory",
  async (_, { dispatch }) => {
    try {
      dispatch(setLoading(true));
      dispatch(setError(undefined));
      const { nodes, edges, dialogues } = await loadStory();
      if (!nodes.length && !edges.length) {
        dispatch(setNodes([]));
        dispatch(setEdges([]));
        return;
      }
      dispatch(setNodes(nodes));
      dispatch(setEdges(edges));
      dispatch(dActions.setDialogues(dialogues));
    } catch (err: any) {
      dispatch(setError(err?.message ?? String(err)));
    } finally {
      dispatch(setLoading(false));
    }
  },
);

export const reflowStoryThunk = createAsyncThunk(
  "story/reflow",
  async (
    _,
    { getState, dispatch },
  ): Promise<{ nodes: StoryNode[]; edges: StoryEdge[] } | undefined> => {
    const state = getState() as RootState;
    const { nodes, edges } = state.story;
    const { nodes: laidOutNodes, edges: laidOutEdges } = await layoutGraph(
      nodes,
      edges,
      { rankdir: "DOWN" },
    );
    dispatch(setNodes(laidOutNodes));
    dispatch(setEdges(laidOutEdges));
    return { nodes: laidOutNodes, edges: laidOutEdges };
  },
);

export const resetStoryThunk = createAsyncThunk(
  "story/resetStory",
  async (_, { dispatch }) => {
    dispatch(resetInstance());
  },
);
