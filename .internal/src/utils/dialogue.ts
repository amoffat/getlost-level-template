export function createUrlPath(id: string, milestone: string | null) {
  if (!milestone) return `/dialogues/${id}`;
  return `/dialogues/${id}/milestones/${milestone}`;
}
