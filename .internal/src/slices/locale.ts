import { defaultLocale } from "@/constants";
import { SupportedLang } from "@/constants/locale";
import type { LocaleEntry } from "@/types/locale";
import { PartialNullable } from "@/types/util";
import {
  createEntityAdapter,
  createSlice,
  PayloadAction,
} from "@reduxjs/toolkit";

const entryAdapter = createEntityAdapter<LocaleEntry, string>({
  selectId: (entry) => entry.k,
});

interface LocaleState {
  currentLocale: SupportedLang;
  /** Raw entries for the default locale. Loaded once at editor init. */
  defaultEntries: ReturnType<typeof entryAdapter.getInitialState>;
  /** Raw entries for the currently active locale. Replaced on locale switch. */
  activeEntries: ReturnType<typeof entryAdapter.getInitialState>;
}

export const slice = createSlice({
  name: "locale",
  initialState: {
    currentLocale: defaultLocale,
    defaultEntries: entryAdapter.getInitialState(),
    activeEntries: entryAdapter.getInitialState(),
  } as LocaleState,

  reducers: {
    setCurrentLocale(state, action: PayloadAction<SupportedLang>) {
      state.currentLocale = action.payload;
    },

    // --- default locale reducers ---
    setDefaultEntries(state, action: PayloadAction<LocaleEntry[]>) {
      entryAdapter.setAll(state.defaultEntries, action.payload);
    },
    upsertDefaultEntry(
      state,
      action: PayloadAction<PartialNullable<LocaleEntry> & { k: string }>,
    ) {
      entryAdapter.upsertOne(
        state.defaultEntries,
        action.payload as LocaleEntry,
      );
    },
    removeDefaultEntry(state, action: PayloadAction<string>) {
      entryAdapter.removeOne(state.defaultEntries, action.payload);
    },

    // --- active locale reducers ---
    setActiveEntries(state, action: PayloadAction<LocaleEntry[]>) {
      entryAdapter.setAll(state.activeEntries, action.payload);
    },
    mergeActiveEntries(state, action: PayloadAction<LocaleEntry[]>) {
      entryAdapter.upsertMany(state.activeEntries, action.payload);
    },
    upsertActiveEntry(
      state,
      action: PayloadAction<PartialNullable<LocaleEntry> & { k: string }>,
    ) {
      entryAdapter.upsertOne(
        state.activeEntries,
        action.payload as LocaleEntry,
      );
    },
    removeActiveEntry(state, action: PayloadAction<string>) {
      entryAdapter.removeOne(state.activeEntries, action.payload);
    },
  },

  selectors: {
    currentLocale: (state) => state.currentLocale,
    /** Active locale entry for the given key. */
    selectEntry: (state, key: string): LocaleEntry | undefined =>
      state.activeEntries.entities[key],
    /** Default locale entry for the given key. */
    selectDefaultEntry: (
      state,
      key: string | undefined,
    ): LocaleEntry | undefined =>
      key ? state.defaultEntries.entities[key] : undefined,
    allDefaultEntries: (state) => state.defaultEntries.entities,
  },
});

export const actions = slice.actions;
export const selectors = slice.selectors;
