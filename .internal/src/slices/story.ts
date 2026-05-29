import { storyOriginNodeId, storyOriginNodeName } from "@/constants";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { Edge, Node } from "@xyflow/react";

export interface MilestoneWaypoint {
  characterId: string;
  waypointId: string;
  speed: number;
}

export interface StoryNodeData extends Record<string, unknown> {
  id: string;
  permanent?: boolean;
  isOrigin?: boolean;
  waypoints?: MilestoneWaypoint[];
}

export interface StoryEdgeData extends Record<string, unknown> {
  negated: boolean;
}
export interface JunctionNodeData extends Record<string, unknown> {
  id: string;
  kind: "or";
}

export type StoryNode = Node<StoryNodeData>;
export type StoryEdge = Edge<StoryEdgeData>;
export type JunctionNode = Node<JunctionNodeData>;

/** The story origin node that is always present and cannot be deleted. */
export const ORIGIN_NODE: StoryNode = {
  id: storyOriginNodeId,
  position: { x: 0, y: 0 },
  type: "story",
  data: { id: storyOriginNodeName, isOrigin: true },
};

interface StoryState {
  nodes: StoryNode[];
  edges: StoryEdge[];
  loading: boolean;
  error?: string;
  /** Incremented on hard reset; used as the `key` for the ReactFlow instance
   *  so it fully remounts with empty defaultNodes/defaultEdges and cannot
   *  write stale internal state back to Redux via onNodesChange/onEdgesChange. */
  instanceKey: number;
}

const initialState: StoryState = {
  nodes: [ORIGIN_NODE],
  edges: [],
  loading: false,
  error: undefined,
  instanceKey: 0,
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
    setEdges(state, action: PayloadAction<StoryEdge[]>) {
      // Strip transient visual state (e.g. drag-highlight styles) so they are
      // never persisted and cannot reappear on page reload.
      state.edges = action.payload.map(
        ({ style: _style, ...edge }) => edge as StoryEdge,
      );
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
    resetInstance(state) {
      state.nodes = [ORIGIN_NODE];
      state.edges = [];
      state.instanceKey += 1;
    },
  },
  selectors: {},
});

export const {
  setNodes,
  setEdges,
  setNodeData,
  setLoading,
  setError,
  resetInstance,
} = slice.actions;

export type { StoryState };
