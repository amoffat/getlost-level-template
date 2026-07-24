import * as constants from "@/constants";
import { actions as localeActions } from "@/slices/locale";
import type { AppDispatch } from "@/store/store";
import type { LocaleEntry } from "@/types/locale";
import { PartialNullable } from "@/types/util";
import { x64 } from "murmurhash3js";
import { v4 as uuidv4 } from "uuid";

export type LocaleEntryMap = Record<string, LocaleEntry | undefined>;

/**
 * Full (128-bit) murmur hash of a source string, as a 32-char hex string.
 *
 * Stored on each entry as `hash` and used ONLY to detect whether a translation
 * is out of date — i.e. whether the source text changed since the translation
 * was written. It is deliberately NOT an identity (see `newLocaleId`) and it
 * intentionally covers the text only, not the context, so editing a string's
 * translator context does not mark existing translations stale.
 */
export function computeSourceHash(text: string): string {
  return x64.hash128(text);
}

/** Mint a fresh, stable identity for a new locale entry. */
export function newLocaleId(): string {
  return uuidv4();
}

export function resolveLocaleText({
  key,
  primaryEntries,
  fallbackEntries,
  defaultText = "",
}: {
  /** Can be null or undefined in cases where we're looking at a cascading
   * object property, where null signifies deliberately unset, and undefined
   * signifies look at the template object */
  key: string | null | undefined;
  primaryEntries: LocaleEntryMap;
  fallbackEntries?: LocaleEntryMap;
  defaultText?: string;
}): string {
  if (!key) {
    return defaultText;
  }

  return primaryEntries[key]?.v ?? fallbackEntries?.[key]?.v ?? defaultText;
}

/**
 * Syncs a locale text field to the store. Identity (`id`) is stable — it is
 * minted once when an entry is first created and never rotates on edit.
 *
 * Return value signals what should happen to the *reference* stored on the
 * owning object (contentKey / nameKey / …):
 * - `string` — a brand-new entry was created; store this id as the reference.
 * - `null`   — the source text was cleared; clear the reference.
 * - `undefined` — leave the reference untouched (edited an existing entry, or
 *   this was a non-main/translation edit which never changes identity).
 */
export function syncLocaleField({
  locale,
  prevEntry,
  defaultEntry,
  dispatch,
  updates,
}: {
  locale: string;
  prevEntry?: LocaleEntry;
  /** The corresponding entry from the default locale, used for cascade logic
   *  and for populating the `original`/`hash` fields in translations. */
  defaultEntry?: LocaleEntry;
  dispatch: AppDispatch;
  updates: PartialNullable<LocaleEntry>;
}): string | null | undefined {
  // If the default locale has no entry for this key yet, assume we are
  // creating a brand-new entry in the default locale regardless of which
  // locale is active.
  locale = defaultEntry ? locale : constants.defaultLocale;
  const main = locale === constants.defaultLocale;

  // Clearing the source text drops the reference (main locale only). A cleared
  // translation must never remove the shared, locale-independent identity.
  if (updates.v === null) {
    return main ? null : undefined;
  }

  if (main) {
    const existing = prevEntry ?? defaultEntry;
    const id = existing?.id ?? newLocaleId();
    const v = updates.v ?? existing?.v ?? "";

    dispatch(
      localeActions.upsertEntry({
        locale,
        entry: {
          ...updates,
          id,
          hash: computeSourceHash(v),
        },
      }),
    );

    // Only signal a reference change when a brand-new entry was created.
    return existing ? undefined : id;
  } else {
    // Should never happen, since if defaultEntry is not defined, we switch to
    // the main locale. We only do this for typescript linting.
    if (!prevEntry && !defaultEntry) return undefined;

    const id = (prevEntry ?? defaultEntry)!.id;

    dispatch(
      localeActions.upsertEntry({
        locale,
        entry: {
          // Persist original + the source hash this translation matches, so we
          // can both show translators the source text and detect staleness.
          original: defaultEntry?.v,
          hash: defaultEntry?.hash,
          ...updates,
          id,
        },
      }),
    );
    return undefined;
  }
}
