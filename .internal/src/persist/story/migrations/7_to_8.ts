import type { Edge } from "@xyflow/react";
import type { Dialogue, DNode } from "@/types/dialogue";
import { BaseStoryDoc } from "../schema";

function cleanupDanglingEdges(dlg: Dialogue): void {
  const validEdges = (dlg.edges.ids as string[])
    .map((id) => dlg.edges.entities[id] as Edge | undefined)
    .filter((edge): edge is Edge => {
      if (!edge) return false;
      const sourceNode = dlg.nodes.entities[edge.source] as DNode | undefined;
      if (!sourceNode) return false;
      if (!dlg.nodes.entities[edge.target]) return false;
      if (edge.sourceHandle) {
        return sourceNode.data.choices.some((c) => c.id === edge.sourceHandle);
      }
      return true;
    });
  dlg.edges.ids = validEdges.map((edge) => edge.id);
  dlg.edges.entities = Object.fromEntries(
    validEdges.map((edge) => [edge.id, edge]),
  );
}

/**
 * Flattens a nested Record<objectId, Record<storyNodeId, Dialogue>> into a
 * deduplicated array of Dialogue objects.
 */
function flattenDialoguesRecord(
  record: Record<string, Record<string, Dialogue>>,
): Dialogue[] {
  const seen = new Set<string>();
  const result: Dialogue[] = [];
  for (const perObj of Object.values(record)) {
    for (const dlg of Object.values(perObj)) {
      if (!seen.has(dlg.id)) {
        seen.add(dlg.id);
        cleanupDanglingEdges(dlg);
        result.push(dlg);
      }
    }
  }
  return result;
}

/**
 * v7 → v8: Editor/engine split.
 *
 * The flat top-level fields of V7 (`nodes`, `edges`, `states`, `dialogues`)
 * are reorganised into two namespaced sub-objects:
 *
 * - `editor`: raw ReactFlow/editor-friendly data (`nodes`, `edges`, and the
 *   flat `dialogues` array).
 * - `engine`: derived engine-compatible data (`states` and the nested
 *   dialogues lookup record).
 *
 * The V7 `dialogues` nested record is flattened into a `Dialogue[]` for
 * `editor.dialogues`, and kept as-is for `engine.dialogues`.
 */
export function migrate(doc: BaseStoryDoc): void {
  const v7 = doc as any;
  const flatDialogues = flattenDialoguesRecord(v7.dialogues ?? {});

  (doc as any).editor = {
    nodes: v7.nodes ?? [],
    edges: v7.edges ?? [],
    dialogues: flatDialogues,
  };

  (doc as any).engine = {
    states: v7.states ?? [],
    dialogues: v7.dialogues ?? {},
  };

  delete v7.nodes;
  delete v7.edges;
  delete v7.states;
  delete v7.dialogues;
}
