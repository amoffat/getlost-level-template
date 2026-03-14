/**
 * Generic graph sorting utilities.
 */

interface GraphEdge {
  source: string;
  target: string;
}

/**
 * Performs a stable topological sort on a directed acyclic graph using Kahn's
 * algorithm. When multiple nodes are eligible at the same level, they are
 * emitted in order of least total connections (in-degree + out-degree) first,
 * producing a deterministic ordering.
 *
 * Nodes involved in cycles are silently omitted from the result.
 *
 * @param nodeIds  - The set of node IDs to include in the sort.
 * @param edges    - Directed edges between nodes. Edges referencing nodes
 *                   outside `nodeIds` are ignored.
 * @returns An array of node IDs in topological order, tie-broken by ascending
 *          connection count.
 */
export function topologicalSort(
  nodeIds: Iterable<string>,
  edges: readonly GraphEdge[],
): string[] {
  const idSet = new Set(nodeIds);

  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();
  const connectionCount = new Map<string, number>();

  for (const id of idSet) {
    inDegree.set(id, 0);
    adjacency.set(id, []);
    connectionCount.set(id, 0);
  }

  for (const edge of edges) {
    if (!idSet.has(edge.source) || !idSet.has(edge.target)) continue;

    adjacency.get(edge.source)!.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
    connectionCount.set(
      edge.source,
      (connectionCount.get(edge.source) ?? 0) + 1,
    );
    connectionCount.set(
      edge.target,
      (connectionCount.get(edge.target) ?? 0) + 1,
    );
  }

  const compareFn = (a: string, b: string) =>
    (connectionCount.get(a) ?? 0) - (connectionCount.get(b) ?? 0);

  // Seed the queue with all zero-in-degree nodes, sorted by connection count
  const queue = [...idSet]
    .filter((id) => (inDegree.get(id) ?? 0) === 0)
    .sort(compareFn);

  const sorted: string[] = [];

  while (queue.length > 0) {
    // Pick the least-connected eligible node
    queue.sort(compareFn);
    const current = queue.shift()!;
    sorted.push(current);

    for (const neighbor of adjacency.get(current) ?? []) {
      const newDeg = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, newDeg);
      if (newDeg === 0) {
        queue.push(neighbor);
      }
    }
  }

  return sorted;
}
