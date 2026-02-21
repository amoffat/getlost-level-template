import { loadStory } from "@/persist/story/api";
import {
  setEdges,
  setError,
  setLoading,
  setNodes,
  StoryNode,
} from "@/slices/story";
import type { RootState } from "@/store/store";
import { layoutGraph } from "@/utils/story";
import { createAsyncThunk } from "@reduxjs/toolkit";
import type { Edge } from "@xyflow/react";

export const loadStoryThunk = createAsyncThunk(
  "story/loadStory",
  async (_, { dispatch }) => {
    try {
      dispatch(setLoading(true));
      dispatch(setError(undefined));
      const { nodes, edges } = await loadStory();
      if (!nodes.length && !edges.length) {
        dispatch(setNodes([]));
        dispatch(setEdges([]));
        return;
      }
      dispatch(setNodes(nodes));
      dispatch(setEdges(edges));
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
  ): Promise<{ nodes: StoryNode[]; edges: Edge[] } | undefined> => {
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
