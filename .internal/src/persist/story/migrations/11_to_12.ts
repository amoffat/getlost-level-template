import { uuid5Hash } from "@/utils/hash";
import { BaseStoryDoc } from "../schema";

/**
 * v11 → v12: Locale keys decoupled from content.
 *
 * Locale entries are now identified by a stable UUID (`id`) instead of the old
 * content-derived murmur key. Every stored reference to a locale string is
 * remapped through the same deterministic transform used by the locale-file
 * migration — `uuid5Hash(oldKey)` — so identities line up across files.
 *
 * Story references live on speech-node data: `contentKey`, `speakerNameKey`,
 * `listenerNameKey`, and each choice's `textKey`. The engine block is rebuilt
 * from the editor block on the post-migration save, so we only touch editor.
 */
function remap(key: unknown): unknown {
  return typeof key === "string" && key.length > 0 ? uuid5Hash(key) : key;
}

export function migrate(doc: BaseStoryDoc): void {
  const v11 = doc as any;
  const dialogues: any[] = v11.editor?.dialogues ?? [];
  for (const dlg of dialogues) {
    const entities = dlg?.nodes?.entities ?? {};
    for (const node of Object.values<any>(entities)) {
      const data = node?.data;
      if (!data) continue;
      if (data.contentKey != null) data.contentKey = remap(data.contentKey);
      if (data.speakerNameKey != null) {
        data.speakerNameKey = remap(data.speakerNameKey);
      }
      if (data.listenerNameKey != null) {
        data.listenerNameKey = remap(data.listenerNameKey);
      }
      if (Array.isArray(data.choices)) {
        for (const choice of data.choices) {
          if (choice?.textKey != null) choice.textKey = remap(choice.textKey);
        }
      }
    }
  }
}
