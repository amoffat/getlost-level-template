import * as constants from "@/constants";
import { actions as localeActions } from "@/slices/locale";
import type { AppDispatch } from "@/store/store";
import type { LocaleEntry } from "@/types/locale";
import { PartialNullable } from "@/types/util";
import { x86 } from "murmurhash3js";

export type LocaleEntryMap = Record<string, LocaleEntry | undefined>;

/** Returns an 8-char hex murmur hash of the given text. */
export function hashText(text: string): string {
  return (x86.hash32(text) >>> 0).toString(16).padStart(8, "0");
}

export function makeKey(...args: (string | undefined)[]) {
  return hashText(args.join(":"));
}

export function resolveLocaleText({
  key,
  primaryEntries,
  fallbackEntries,
  defaultText = "",
}: {
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
 * Syncs a locale text field to the store, handling both main and non-main
 * locales.
 *
 * - `main: true` — derives a new key via `makeKey`, removes the old entry if
 *   the key changed, syncs the new entry, and returns the new key.
 * - `main: false` — updates the translated value for the existing key,
 *   writing `original: defaultEntry.v` so translators have context in the
 *   raw JSONL file. Returns `undefined` (key is unchanged).
 */
export function syncLocaleField({
  locale,
  prevEntry,
  defaultEntry,
  makeKey,
  dispatch,
  updates,
}: {
  locale: string;
  prevEntry?: LocaleEntry;
  /** The corresponding entry from the default locale, used for cascade logic
   *  and for populating the `original` field in non-default locale entries. */
  defaultEntry?: LocaleEntry;
  makeKey: ({ text, context }: { text?: string; context?: string }) => string;
  dispatch: AppDispatch;
  updates: PartialNullable<LocaleEntry>;
}): string | undefined {
  // If the default locale has no entry for this key yet, assume we are
  // creating a brand-new entry in the default locale regardless of which
  // locale is active.
  locale = defaultEntry ? locale : constants.defaultLocale;
  const main = locale === constants.defaultLocale;

  if (updates.v === null) {
    return;
  }

  if (main) {
    const k = makeKey({
      text: updates.v ?? prevEntry?.v,
      context: updates.ctx ?? prevEntry?.ctx,
    });

    dispatch(
      localeActions.upsertEntry({
        locale,
        entry: {
          ...updates,
          k,
        },
      }),
    );

    return k;
  } else {
    // Should never happen, since if defaultEntry is not defined, we switch to
    // the main locale. We only do this for typescript linting.
    if (!prevEntry && !defaultEntry) return;

    const entryKey = (prevEntry ?? defaultEntry)!.k;

    dispatch(
      localeActions.upsertEntry({
        locale,
        entry: {
          // Persist original so translators can see the default text in the
          // raw JSONL file.
          original: defaultEntry?.v,
          ...updates,
          k: entryKey,
        },
      }),
    );
    return;
  }
}
