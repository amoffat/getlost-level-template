import * as constants from "@/constants";
import type { AppDispatch } from "@/store/store";
import {
  removeLocaleEntryThunk,
  upsertLocaleEntryThunk,
} from "@/thunks/locale";
import type { LocaleEntry } from "@/types/locale";
import { PartialNullable } from "@/types/util";
import { x86 } from "murmurhash3js";

/** Returns an 8-char hex murmur hash of the given text. */
export function hashText(text: string): string {
  return (x86.hash32(text) >>> 0).toString(16).padStart(8, "0");
}

export function makeKey(...args: (string | undefined)[]) {
  return hashText(args.join(":"));
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
  prevEntry,
  makeKey,
  dispatch,
  updates,
}: {
  locale: string;
  prevEntry: LocaleEntry | null;
  makeKey: ({ text, context }: { text?: string; context?: string }) => string;
  dispatch: AppDispatch;
  updates: PartialNullable<LocaleEntry>;
}): string | undefined {
  // If we're editing an entry in a locale, but our main locale doesn't have an
  // entry, then assume this locale IS the main locale (even if it's not
  // selected).
  locale = prevEntry ? locale : constants.defaultLocale;
  const main = locale === constants.defaultLocale;

  if (updates.v === null) {
    if (prevEntry) {
      dispatch(removeLocaleEntryThunk({ locale, key: prevEntry.k }));
    }
    return;
  }

  if (main) {
    const k = makeKey({
      text: updates.v ?? prevEntry?.v,
      context: updates.ctx ?? prevEntry?.ctx,
    });

    if (prevEntry && prevEntry.k !== k) {
      dispatch(removeLocaleEntryThunk({ locale, key: prevEntry.k }));
    }
    dispatch(
      upsertLocaleEntryThunk({
        locale,
        entry: {
          ...updates,
          k,
        },
      }),
    );
    return k;
  } else {
    // Should never happen, since if existingEntry is not defined, we switch to
    // the main locale. We only do this for typescript linting.
    if (!prevEntry) return;

    dispatch(
      upsertLocaleEntryThunk({
        locale,
        entry: {
          original: prevEntry.v,
          ctx: prevEntry.ctx,
          ...updates,
          k: prevEntry.k,
        },
      }),
    );
    return;
  }
}
