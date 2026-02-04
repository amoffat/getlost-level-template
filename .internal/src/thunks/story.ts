import { loadStory } from "@/persist/story/api";
import { setEdges, setError, setLoading, setNodes } from "@/slices/story";
import type { RootState } from "@/store/store";
import { layoutStory } from "@/utils/story";
import { createAsyncThunk } from "@reduxjs/toolkit";
// ELK layout logic was extracted into utils; thunk now just loads nodes/edges

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
  async (_, { getState, dispatch }) => {
    const state = getState() as RootState;
    const { nodes, edges } = state.story;
    const { nodes: laidOutNodes, edges: laidOutEdges } = await layoutStory(
      nodes,
      edges,
      { rankdir: "TB" },
    );
    dispatch(setNodes(laidOutNodes));
    dispatch(setEdges(laidOutEdges));
  },
);
