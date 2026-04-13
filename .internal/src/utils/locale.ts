import * as constants from "@/constants";
import type { AppDispatch } from "@/store/store";
import { removeLocaleEntryThunk, syncLocaleEntryThunk } from "@/thunks/locale";
import type { LocaleEntry } from "@/types/locale";
import { x86 } from "murmurhash3js";

/** Returns an 8-char hex murmur hash of the given text. */
export function hashText(text: string): string {
  return (x86.hash32(text) >>> 0).toString(16).padStart(8, "0");
}

/**
 * Returns a locale key for node content or choice text, prefixed by the
 * owning ID (node ID or choice ID) so that identical text on different nodes
 * can carry independent translations.
 */
export function makeLocaleKey({
  text,
  prefix,
}: {
  text: string;
  prefix?: string;
}): string {
  if (!prefix) return hashText(text);
  return `${prefix}:${hashText(text)}`;
}

/**
 * Syncs a locale text field to the store, handling both main and non-main
 * locales.
 *
 * - `main: true` — derives a new key via `makeKey`, removes the old entry if
 *   the key changed, syncs the new entry, and returns the new key.
 * - `main: false` — updates the translated value for the existing key,
 *   preserving `original`, `ctx`, and `lock`. Returns `undefined` (key is
 *   unchanged).
 */
export function syncLocaleField({
  locale,
  existingEntry,
  newText,
  makeKey,
  ctx,
  dispatch,
}: {
  locale: string;
  existingEntry: LocaleEntry | null;
  newText: string | null;
  makeKey: (text: string) => string;
  ctx?: string;
  dispatch: AppDispatch;
}): string | undefined {
  // If we're editing an entry in a locale, but our main locale doesn't have an
  // entry, then assume this locale IS the main locale (even if it's not
  // selected).
  locale = existingEntry ? locale : constants.defaultLocale;
  const main = locale === constants.defaultLocale;

  if (!newText) {
    if (existingEntry) {
      dispatch(removeLocaleEntryThunk({ locale, key: existingEntry.k }));
    }
    return;
  }

  if (main) {
    const newKey = makeKey(newText);
    if (existingEntry && existingEntry.k !== newKey) {
      dispatch(removeLocaleEntryThunk({ locale, key: existingEntry.k }));
    }
    dispatch(
      syncLocaleEntryThunk({
        locale,
        entry: {
          k: newKey,
          v: newText,
          ctx,
        },
      }),
    );
    return newKey;
  } else {
    // Should never happen, since if existingEntry is not defined, we switch to
    // the main locale. We only do this for typescript linting.
    if (!existingEntry) return;

    dispatch(
      syncLocaleEntryThunk({
        locale,
        entry: {
          k: existingEntry.k,
          v: newText,
          original: existingEntry.original,
          ctx: ctx ?? existingEntry.ctx,
        },
      }),
    );
    return;
  }
}
