import type { StoryNode } from "@/slices/story";
import type { Edge } from "@xyflow/react";
import ELK from "elkjs/lib/elk.bundled.js";

export interface LayoutOptions {
  rankdir?: "TB" | "LR" | "BT" | "RL";
  ranksep?: number;
  nodesep?: number;
  marginx?: number;
  marginy?: number;
}

// Re-layout story nodes and edges using ELK, returning updated node positions.
export async function layoutStory(
  nodes: StoryNode[],
  edges: Edge[],
  options: LayoutOptions = {}
): Promise<{ nodes: StoryNode[]; edges: Edge[] }> {
  const {
    rankdir = "TB",
    ranksep = 120,
    nodesep = 80,
    marginx = 20,
    marginy = 20,
  } = options;

  const dirMap: Record<string, string> = {
    TB: "DOWN",
    LR: "RIGHT",
    BT: "UP",
    RL: "LEFT",
  };

  const elk = new ELK();
  const elkGraph: any = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": dirMap[rankdir] ?? "DOWN",
      "elk.layered.spacing.nodeNodeBetweenLayers": String(ranksep),
      "elk.spacing.nodeNode": String(nodesep),
      "elk.padding": `${marginy} ${marginx} ${marginy} ${marginx}`,
    },
    children: nodes.map((n) => ({
      id: n.id,
      width: (n as any).width ?? 180,
      height: (n as any).height ?? 48,
      label: n.data?.label ?? n.id,
    })),
    edges: edges.map((e, i) => ({
      id: e.id ?? `e${i}`,
      sources: [e.source],
      targets: [e.target],
    })),
  };

  const result = await elk.layout(elkGraph);
  const laidOutNodes: StoryNode[] = (result.children ?? []).map((n: any) => {
    const x = n.x ?? 0;
    const y = n.y ?? 0;
    // preserve other node fields
    const original = nodes.find((o) => o.id === n.id) as StoryNode;
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
