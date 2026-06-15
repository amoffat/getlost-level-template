/**
 * Snapshot the current values of selected fields for a set of entities,
 * returning a payload shaped for `updateMany`/`updateOne`.
 *
 * Capture this BEFORE applying a change and use the result as the `undo` side
 * of a transaction — replaying it restores the prior field values. This keeps
 * transactions cheap: only the touched fields of the touched entities are
 * recorded, not the whole collection.
 *
 * Entities missing from the dictionary are skipped (e.g. removed mid-edit).
 */
export function captureEntityChanges<T extends { id: string }>(
  entities: Record<string, T | undefined>,
  ids: string[],
  fields: (keyof T)[],
): Array<{ id: string; changes: Partial<T> }> {
  const result: Array<{ id: string; changes: Partial<T> }> = [];
  for (const id of ids) {
    const entity = entities[id];
    if (!entity) continue;
    const changes: Partial<T> = {};
    for (const field of fields) {
      changes[field] = entity[field];
    }
    result.push({ id, changes });
  }
  return result;
}
