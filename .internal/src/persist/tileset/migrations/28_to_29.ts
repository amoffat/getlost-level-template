import { uuid5Hash } from "@/utils/hash";
import type { TilesetDocV28 } from "../schema";

/**
 * Migration from version 28 to 29:
 * Locale keys decoupled from content. Locale entries are now identified by a
 * stable UUID (`id`) instead of the old content-derived murmur key. NPC,
 * tilegroup, and animation templates reference their display-name string via
 * `nameKey`. We deep-walk the tileset doc and remap any `nameKey` through the
 * same deterministic transform used by the locale-file migration —
 * `uuid5Hash(oldKey)` — so identities stay consistent across files.
 */
function remapDeep(value: unknown): void {
  if (Array.isArray(value)) {
    for (const item of value) remapDeep(item);
    return;
  }
  if (value === null || typeof value !== "object") return;
  const obj = value as Record<string, unknown>;
  for (const [k, v] of Object.entries(obj)) {
    if (k === "nameKey" && typeof v === "string" && v.length > 0) {
      obj[k] = uuid5Hash(v);
    } else {
      remapDeep(v);
    }
  }
}

export async function migrate(doc: TilesetDocV28) {
  remapDeep(doc.tileset);
}
