import type { Edge, Node } from "@xyflow/react";
import ELK from "elkjs/lib/elk.bundled.js";

export interface LayoutOptions {
  rankdir?: "DOWN" | "RIGHT" | "UP" | "LEFT";
  ranksep?: number;
  nodesep?: number;
  marginx?: number;
  marginy?: number;
}

// Re-layout story nodes and edges using ELK, returning updated node positions.
export async function layoutGraph<
  NodeType extends Node = Node,
  EdgeType extends Edge = Edge,
>(
  nodes: NodeType[],
  edges: EdgeType[],
  options: LayoutOptions = {},
): Promise<{ nodes: NodeType[]; edges: EdgeType[] }> {
  const {
    rankdir = "DOWN",
    ranksep = 120,
    nodesep = 80,
    marginx = 20,
    marginy = 20,
  } = options;

  const elk = new ELK();
  const elkGraph: any = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": rankdir,
      "elk.layered.spacing.nodeNodeBetweenLayers": String(ranksep),
      "elk.spacing.nodeNode": String(nodesep),
      "elk.padding": `${marginy} ${marginx} ${marginy} ${marginx}`,
    },
    children: nodes.map((n) => ({
      id: n.id,
      width: n.width ?? n.measured?.width ?? 150,
      height: n.height ?? n.measured?.height ?? 50,
      label: n.data?.speakerNameKey ?? n.id,
    })),
    edges: edges.map((e, i) => ({
      id: e.id ?? `e${i}`,
      sources: [e.source],
      targets: [e.target],
    })),
  };

  const result = await elk.layout(elkGraph);
  const laidOutNodes: NodeType[] = (result.children ?? []).map((n) => {
    const x = n.x ?? 0;
    const y = n.y ?? 0;
    // preserve other node fields
    const original = nodes.find((o) => o.id === n.id) as NodeType;
    return {
      ...original,
      id: n.id,
      position: { x, y },
      data: {
        ...original?.data,
        label: n.label ?? original?.data?.label ?? n.id,
      },
    };
  });

  return { nodes: laidOutNodes, edges };
}
