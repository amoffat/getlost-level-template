import { defaultLocale } from "@/constants";
import { SupportedLang } from "@/constants/locale";
import { actions } from "@/slices/locale";
import type { RootState } from "@/store/store";
import type { LocaleEntry } from "@/types/locale";
import { PartialNullable } from "@/types/util";
import { createAsyncThunk } from "@reduxjs/toolkit";

const LOCALE_FILE = "dialogue";

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
 * Load the dialogue locale file for the given locale.
 *
 * - When `locale` is the default locale: fetches its entries, populates both
 *   `defaultEntries` and `activeEntries` with the same data. This is called
 *   once at editor init (via `loadStoryThunk`) and whenever the user switches
 *   back to the default locale.
 * - When `locale` is a non-default locale: fetches its entries and sets
 *   `activeEntries`.
 */
export const loadDialogueLocaleThunk = createAsyncThunk(
  "locale/loadDialogue",
  async (locale: string, { dispatch }) => {
    if (locale === defaultLocale) {
      const entries = await fetchEntries(defaultLocale);
      dispatch(actions.setDefaultEntries(entries));
      dispatch(actions.setActiveEntries(entries));
      return;
    }

    const localeEntries = await fetchEntries(locale);
    dispatch(actions.setActiveEntries(localeEntries));
  },
);

/**
 * Upsert a single locale entry for the given locale into the redux store.
 * The autosave middleware will sync the updated state to the backend.
 *
 * Updates `defaultEntries` when `locale` is the default locale.
 * Updates `activeEntries` when `locale` matches the current active locale.
 */
export const upsertLocaleEntryThunk = createAsyncThunk(
  "locale/syncEntry",
  async (
    {
      locale,
      entry,
    }: { locale: string; entry: PartialNullable<LocaleEntry> & { k: string } },
    { dispatch, getState },
  ) => {
    if (locale === defaultLocale) {
      dispatch(actions.upsertDefaultEntry(entry));
    }
    const state = getState() as RootState;
    if (locale === state.locale.currentLocale) {
      dispatch(actions.upsertActiveEntry(entry));
    }
  },
);

export const setLocaleThunk = createAsyncThunk(
  "locale/set",
  async (locale: SupportedLang, { dispatch }) => {
    await dispatch(loadDialogueLocaleThunk(locale)).unwrap();
    dispatch(actions.setCurrentLocale(locale));
  },
);
