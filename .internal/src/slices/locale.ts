import { defaultLocale } from "@/constants";
import { SupportedLang } from "@/constants/locale";
import type { LocaleEntry } from "@/types/locale";
import { PartialNullable } from "@/types/util";
import {
  createEntityAdapter,
  createSlice,
  EntityState,
  PayloadAction,
} from "@reduxjs/toolkit";
import i18next from "i18next";

const entryAdapter = createEntityAdapter<LocaleEntry, string>({
  selectId: (entry) => entry.k,
});

type LocaleEntityState = EntityState<LocaleEntry, string>;

interface LocaleState {
  activeLocale: SupportedLang;
  userLocale: SupportedLang;
  /** All loaded locale entries, keyed by locale string. */
  entries: Record<string, LocaleEntityState>;
}

function ensureLocale(state: LocaleState, locale: string): LocaleEntityState {
  if (!state.entries[locale]) {
    state.entries[locale] = entryAdapter.getInitialState();
  }
  return state.entries[locale];
}

export const slice = createSlice({
  name: "locale",
  initialState: {
    // The locale of the user. This changes the editor UI
    userLocale: i18next.language,
    // The locale of the level, for checking/editing translations in the dialogue tab.
    activeLocale: defaultLocale,
    entries: {},
  } as LocaleState,

  reducers: {
    setActiveLocale(state, action: PayloadAction<SupportedLang>) {
      state.activeLocale = action.payload;
    },

    setUserLocale(state, action: PayloadAction<SupportedLang>) {
      state.userLocale = action.payload;
    },

    setEntries(
      state,
      action: PayloadAction<{ locale: string; entries: LocaleEntry[] }>,
    ) {
      const bucket = ensureLocale(state, action.payload.locale);
      entryAdapter.setAll(bucket, action.payload.entries);
    },

    upsertEntry(
      state,
      action: PayloadAction<{
        locale: string;
        entry: PartialNullable<LocaleEntry> & { k: string };
      }>,
    ) {
      const { locale, entry } = action.payload;
      const bucket = ensureLocale(state, locale);
      entryAdapter.upsertOne(bucket, entry as LocaleEntry);
    },

    removeEntry(state, action: PayloadAction<{ locale: string; key: string }>) {
      const bucket = state.entries[action.payload.locale];
      if (bucket) {
        entryAdapter.removeOne(bucket, action.payload.key);
      }
    },
  },

  selectors: {
    activeLocale: (state) => state.activeLocale,
    userLocale: (state) => state.userLocale,
    /** Active locale entry for the given key. */
    selectEntry: (state, key: string): LocaleEntry | undefined =>
      state.entries[state.activeLocale]?.entities[key],
    /** All entries for the currently active locale. */
    selectActiveEntries: (state) =>
      state.entries[state.activeLocale]?.entities ?? {},
    /** Default locale entry for the given key. */
    selectDefaultEntry: (
      state,
      key: string | undefined,
    ): LocaleEntry | undefined =>
      key ? state.entries[defaultLocale]?.entities[key] : undefined,
    selectDefaultEntries: (state) =>
      state.entries[defaultLocale]?.entities ?? {},
    /**
     * For each non-default loaded locale, returns the count of entries where
     * `v` equals `original` (i.e. the value has not been translated).
     * Only entries that have an `original` field set are considered.
     */
    untranslatedCounts: (state): Partial<Record<SupportedLang, number>> => {
      const result: Partial<Record<SupportedLang, number>> = {};
      for (const [locale, entityState] of Object.entries(state.entries)) {
        if (locale === defaultLocale) continue;
        let count = 0;
        for (const key of entityState.ids as string[]) {
          const entry = entityState.entities[key];
          if (entry?.original !== undefined && entry.v === entry.original) {
            count++;
          }
        }
        result[locale as SupportedLang] = count;
      }
      return result;
    },
  },
});

export const actions = slice.actions;
export const selectors = slice.selectors;
