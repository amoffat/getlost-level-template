import { codeToLanguage } from "@/constants/locale";
import { actions } from "@/slices/locale";
import { clearLocaleReferences } from "@/store/middleware/locale/references";
import type { RootState } from "@/store/store";
import { SupportedLang, supportedLangs } from "@/types/i18n";
import type { LocaleEntry } from "@/types/locale";
import { notifications } from "@mantine/notifications";
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
 * Load the dialogue locale file for the given locale into `entries[locale]`.
 */
export const loadDialogueLocaleThunk = createAsyncThunk(
  "locale/loadDialogue",
  async (locale: string, { dispatch }) => {
    const entries = await fetchEntries(locale);
    dispatch(actions.setEntries({ locale, entries }));
  },
);

/**
 * Load dialogue locale files for all supported languages in parallel.
 * Locales with no file (404) are silently stored as empty.
 */
export const loadAllLocalesThunk = createAsyncThunk(
  "locale/loadAll",
  async (_, { dispatch }) => {
    await Promise.all(
      supportedLangs.map(async (locale) => {
        const entries = await fetchEntries(locale);
        dispatch(actions.setEntries({ locale, entries }));
      }),
    );
  },
);

/**
 * Delete locale entries everywhere: drop them from every locale file AND clear
 * any object references that point at them, so nothing is left dangling.
 *
 * Both halves are driven by the single reference registry in
 * `store/middleware/locale/references.ts` — the same source of truth the autosave
 * middleware uses to decide which entries are live — so there is no per-slice
 * traversal to maintain here.
 */
export const deleteLocaleEntriesThunk = createAsyncThunk(
  "locale/deleteEntries",
  async (ids: string[], { dispatch, getState }) => {
    if (ids.length === 0) return;
    const state = getState() as RootState;

    // Null out every dangling reference to these ids across the whole store.
    for (const action of clearLocaleReferences(state, new Set(ids))) {
      dispatch(action);
    }

    // Then remove the entries from every locale bucket. This keeps the store
    // consistent and triggers the locale autosave, which prunes them from disk.
    for (const locale of supportedLangs) {
      for (const id of ids) {
        dispatch(actions.removeEntry({ locale, key: id }));
      }
    }
  },
);

export const setActiveLocaleThunk = createAsyncThunk(
  "locale/setActive",
  async (locale: SupportedLang, { dispatch }) => {
    await dispatch(loadDialogueLocaleThunk(locale)).unwrap();
    dispatch(actions.setActiveLocale(locale));
    notifications.show({
      title: "Language changed",
      message: `The story dialogue and names are now in ${codeToLanguage[locale]}`,
    });
  },
);

export const setUserLocaleThunk = createAsyncThunk(
  "locale/setUser",
  async (locale: SupportedLang, { dispatch }) => {
    dispatch(actions.setUserLocale(locale));

    if (locale !== "en") {
      notifications.show({
        title: "Language changed",
        color: "red",
        message: "Only english is currently supported.",
      });
    }

    return;
    notifications.show({
      title: "Language changed",
      message: `The editor interface is now in ${codeToLanguage[locale]}`,
    });
  },
);
