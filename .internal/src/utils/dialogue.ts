export function createUrlPath(id: string, milestone: string | null) {
  if (!milestone) return id;
  return `${id}/${milestone}`;
}
