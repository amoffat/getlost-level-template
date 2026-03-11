import type { StoryDocV4, StoryState } from "../schema";

export async function migrate(doc: StoryDocV4 & { states?: StoryState[] }) {
  const nodes = doc.nodes ?? [];
  const edges = doc.edges ?? [];

  const stateMap = new Map<string, StoryState>();

  for (const node of nodes) {
    stateMap.set(node.id, {
      id: node.id,
      dependencies: [],
      dependents: [],
    });
  }

  for (const edge of edges) {
    const source = stateMap.get(edge.source);
    const target = stateMap.get(edge.target);
    if (target && !target.dependencies.includes(edge.source)) {
      target.dependencies.push(edge.source);
    }
    if (source && !source.dependents.includes(edge.target)) {
      source.dependents.push(edge.target);
    }
  }

  doc.states = Array.from(stateMap.values());

  // Clean up old properties
  delete (doc as any).nodes;
  delete (doc as any).edges;
}
