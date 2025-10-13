import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Edge } from "@xyflow/react";
import type { DNode } from "../types/dialogue";

interface DialogueState {
  nodes: DNode[];
  edges: Edge[];
}

export const slice = createSlice({
  name: "dialogue",
  initialState: {
    nodes: [],
    edges: [],
  } as DialogueState,
  reducers: {
    setNodes(state, action: PayloadAction<DNode[]>) {
      state.nodes = action.payload;
    },
    setEdges(state, action: PayloadAction<Edge[]>) {
      state.edges = action.payload;
    },
    setNodeData(
      state,
      action: PayloadAction<{ id: string; data: Partial<DNode["data"]> }>
    ) {
      const { id, data } = action.payload;
      const node = state.nodes.find((n) => n.id === id);
      if (node) {
        node.data = { ...node.data, ...data };
      }
    },
  },
});

export const { setNodes, setEdges, setNodeData } = slice.actions;
