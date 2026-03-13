import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { Edge, Node } from "@xyflow/react";

export interface StoryNodeData extends Record<string, unknown> {
  id: string;
}

export type StoryNode = Node<StoryNodeData>;

export interface JunctionNodeData extends Record<string, unknown> {
  id: string;
  kind: "or";
}

export type JunctionNode = Node<JunctionNodeData>;

export interface StoryEdgeData extends Record<string, unknown> {
  negated: boolean;
}

interface StoryState {
  nodes: StoryNode[];
  edges: Edge[];
  loading: boolean;
  error?: string;
}

const initialState: StoryState = {
  nodes: [],
  edges: [],
  loading: false,
  error: undefined,
};

export const slice = createSlice({
  name: "story",
  initialState,
  reducers: {
    // Syncing from React Flow: preserve the data of the nodes, because
    // the redux store has the authoritative data and RF just manages
    // positions, sizes, connections, etc.
    setNodes(state, action: PayloadAction<StoryNode[]>) {
      state.nodes = action.payload.map((node) => {
        const oldNode = state.nodes.find((n) => n.id === node.id);
        if (oldNode) {
          return { ...node, data: oldNode.data };
        }
        return node;
      });
    },
    setEdges(state, action: PayloadAction<Edge[]>) {
      state.edges = action.payload;
    },
    setNodeData(
      state,
      action: PayloadAction<{ id: string; data: Partial<StoryNodeData> }>,
    ) {
      const { id, data } = action.payload;
      const node = state.nodes.find((n) => n.id === id);
      if (node) node.data = { ...node.data, ...data } as StoryNodeData;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setError(state, action: PayloadAction<string | undefined>) {
      state.error = action.payload;
    },
  },
  selectors: {},
});

export const { setNodes, setEdges, setNodeData, setLoading, setError } =
  slice.actions;

export type { StoryState };
