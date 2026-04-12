import { defaultLocale } from "@/constants";
import { actions } from "@/slices/locale";
import type { LocaleEntry } from "@/types/locale";
import { createAsyncThunk } from "@reduxjs/toolkit";

const LOCALE_FILE = "dialogue";

function entryUrl(locale: string, key: string): string {
  return `/level/locales/${locale}/${LOCALE_FILE}/${encodeURIComponent(key)}`;
}

/** Parse a JSONL response body into an array of LocaleEntry objects. */
async function parseJsonl(res: Response): Promise<LocaleEntry[]> {
  const text = await res.text();
  return text
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as LocaleEntry);
}

async function fetchEntries(locale: string): Promise<LocaleEntry[]> {
  const res = await fetch(`/level/locales/${locale}/${LOCALE_FILE}.jsonl`);
  return res.ok ? parseJsonl(res) : [];
}

/**
 * Load the dialogue locale file for the given locale. Main locale entries are
 * always loaded first as the base layer; if a non-main locale is requested its
 * entries are merged on top so that untranslated keys fall back to their main
 * text.
 */
export const loadDialogueLocaleThunk = createAsyncThunk(
  "locale/loadDialogue",
  async (locale: string, { dispatch }) => {
    const mainEntries = await fetchEntries(defaultLocale);
    dispatch(actions.setEntries(mainEntries));

    if (locale !== defaultLocale) {
      const localeEntries = await fetchEntries(locale);
      dispatch(actions.mergeEntries(localeEntries));
    }
  },
);

/**
 * Upsert a single locale entry for the current locale.
 * Updates the Redux store optimistically, then persists to the API.
 */
export const syncLocaleEntryThunk = createAsyncThunk(
  "locale/syncEntry",
  async (
    { locale, entry }: { locale: string; entry: LocaleEntry },
    { dispatch },
  ) => {
    dispatch(actions.upsertEntry(entry));
    await fetch(entryUrl(locale, entry.k), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });
  },
);

/**
 * Remove a locale entry by key from the current locale.
 * Updates Redux store optimistically, then persists to the API.
 */
export const removeLocaleEntryThunk = createAsyncThunk(
  "locale/removeEntry",
  async ({ locale, key }: { locale: string; key: string }, { dispatch }) => {
    dispatch(actions.removeEntry(key));
    await fetch(entryUrl(locale, key), { method: "DELETE" });
  },
);

export const setLocaleThunk = createAsyncThunk(
  "locale/set",
  async (locale: string, { dispatch }) => {
    await dispatch(loadDialogueLocaleThunk(locale)).unwrap();
    dispatch(actions.setCurrentLocale(locale));
  },
);
