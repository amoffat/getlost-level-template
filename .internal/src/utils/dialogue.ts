export function createUrlPath({
  id,
  milestone,
  nodeId,
}: {
  id: string;
  milestone?: string | null;
  nodeId?: string | null;
}) {
  if (!milestone) return `/dialogues/${id}`;
  if (!nodeId) return `/dialogues/${id}/milestones/${milestone}`;
  return `/dialogues/${id}/milestones/${milestone}/nodes/${nodeId}`;
}
