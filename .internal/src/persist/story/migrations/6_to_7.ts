import { BaseStoryDoc } from "../schema";

/**
 * v6 → v7: The `dialogues` field changes type from
 * `Record<string, Dialogue>` to `Record<string, Record<string, Dialogue>>`.
 *
 * In v6, dialogues were never actually persisted (the field was always saved
 * as `{}`), so no data conversion is necessary — we just reset it to an
 * empty record that satisfies the new type.
 */
export function migrate(doc: BaseStoryDoc): void {
  (doc as any).dialogues = {};
}
