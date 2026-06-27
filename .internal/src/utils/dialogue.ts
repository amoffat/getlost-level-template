import type { Dialogue, DNode } from "@/types/dialogue";

export function createUrlPath({
  id,
  nodeId,
}: {
  id: string;
  nodeId?: string | null;
}) {
  if (!nodeId) return `/dialogues/${id}`;
  return `/dialogues/${id}/nodes/${nodeId}`;
}

/**
 * Returns the de-duped set of participant ids in a dialogue — the union of every
 * node's non-null `speakerId` and `listenerId`. Used to list dialogues under
 * each participating character in the tree and to index engine dialogues.
 */
export function participantsOf(dlg: Dialogue): Set<string> {
  const participants = new Set<string>();
  for (const id of dlg.nodes.ids as string[]) {
    const node = dlg.nodes.entities[id] as DNode | undefined;
    if (!node) continue;
    if (node.data.speakerId) participants.add(node.data.speakerId);
    if (node.data.listenerId) participants.add(node.data.listenerId);
  }
  return participants;
}
