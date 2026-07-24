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
}

export interface LocaleStatePayload {
  locale: string;
  entries: LocaleEntry[];
}
