export interface LocaleEntry {
  /**
   * Stable identity for this string, minted once and never changed on edit.
   * This is the value referenced by game objects (contentKey, nameKey, …) and
   * looked up by the engine. New entries get a UUID; legacy entries are
   * migrated from the old content-derived key via `uuid5Hash`.
   */
  id: string;
  v: string;
  /**
   * Full murmur hash of the source text at the time this entry was written.
   * Used ONLY to detect whether a translation is out of date (its source
   * changed since it was translated). Not an identity.
   */
  hash?: string;
  original?: string;
  ctx?: string;
  /**
   * When true, this entry is kept by the autosave pruner even if no object
   * references its id. Set on manually-authored ("Add entry") keys, which must
   * be removed via explicit Delete rather than being auto-pruned. Only ever
   * stored on the main (source) entry — it is the single source of truth.
   */
  pin?: boolean;
}

export interface LocaleStatePayload {
  locale: string;
  entries: LocaleEntry[];
}
