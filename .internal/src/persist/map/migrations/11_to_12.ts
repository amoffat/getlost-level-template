import { uuid5Hash } from "@/utils/hash";
import { BaseMapDoc } from "../schema";

/**
 * v11 → v12: Locale keys decoupled from content.
 *
 * Locale entries are now identified by a stable UUID (`id`) instead of the old
 * content-derived murmur key. Map objects (and templates) reference locale
 * strings through the fields `nameKey` and `descriptionKey` — on pickups
 * directly, and on speakable instances/templates as property values. We deep-
 * walk the whole map doc and remap any such field through the same
 * deterministic transform used by the locale-file migration, `uuid5Hash`, so
 * identities stay consistent across files.
 */
const LOCALE_KEY_FIELDS = new Set(["nameKey", "descriptionKey"]);

function remapDeep(value: unknown): void {
  if (Array.isArray(value)) {
    for (const item of value) remapDeep(item);
    return;
  }
  if (value === null || typeof value !== "object") return;
  const obj = value as Record<string, unknown>;
  for (const [k, v] of Object.entries(obj)) {
    if (LOCALE_KEY_FIELDS.has(k) && typeof v === "string" && v.length > 0) {
      obj[k] = uuid5Hash(v);
    } else {
      remapDeep(v);
    }
  }
}

export function migrate(doc: BaseMapDoc): void {
  remapDeep((doc as any).map);
}
