import { createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Edge } from "@xyflow/react";
import type { DNode } from "../types/dialogue";

interface DialogueState {
  nodes: Record<string, DNode>;
  edges: Edge[];
}

const dialogueSelector = createSelector.withTypes<DialogueState>();

export const slice = createSlice({
  name: "dialogue",
  initialState: {
    nodes: {},
    edges: [],
  } as DialogueState,
  reducers: {
    addNode(state, action: PayloadAction<DNode>) {
      const node = action.payload;
      state.nodes[node.id] = node;
    },
    // Syncing from React Flow is a bit more complex than just replacing the
    // nodes, because we want to preserve the data of the nodes. This is because
    // the redux store has the authoritative data, and RF just manages the
    // positions, sizes, connections, etc.
    syncFromRF(state, action: PayloadAction<DNode[]>) {
      const nodesById: Record<string, DNode> = {};
      action.payload.forEach((node) => {
        const oldNode = state.nodes[node.id];
        if (oldNode) {
          node.data = oldNode.data;
        }
        nodesById[node.id] = node;
      });
      state.nodes = nodesById;
    },
    setEdges(state, action: PayloadAction<Edge[]>) {
      state.edges = action.payload;
    },
    setNodeData(
      state,
      action: PayloadAction<{ id: string; data: Partial<DNode["data"]> }>,
    ) {
      const { id, data } = action.payload;
      const node = state.nodes[id];
      if (node) {
        node.data = { ...node.data, ...data };
      }
    },
  },
  selectors: {
    selectNode: dialogueSelector(
      (state) => state.nodes,
      (_: DialogueState, nodeId: string) => nodeId,
      (nodes, nodeId): DNode | null => nodes[nodeId] ?? null,
    ),
  },
});

export const selectors = slice.selectors;
export const actions = slice.actions;
