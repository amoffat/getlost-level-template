import { defaultLocale } from "@/constants";
import type { LocaleEntry } from "@/types/locale";
import {
  createEntityAdapter,
  createSlice,
  PayloadAction,
} from "@reduxjs/toolkit";

const entryAdapter = createEntityAdapter<LocaleEntry, string>({
  selectId: (entry) => entry.k,
});

interface LocaleState {
  currentLocale: string;
  entries: ReturnType<typeof entryAdapter.getInitialState>;
}

export const slice = createSlice({
  name: "locale",
  initialState: {
    currentLocale: defaultLocale,
    entries: entryAdapter.getInitialState(),
  } as LocaleState,

  reducers: {
    setCurrentLocale(state, action: PayloadAction<string>) {
      state.currentLocale = action.payload;
    },
    setEntries(state, action: PayloadAction<LocaleEntry[]>) {
      entryAdapter.setAll(state.entries, action.payload);
    },
    mergeEntries(state, action: PayloadAction<LocaleEntry[]>) {
      entryAdapter.upsertMany(state.entries, action.payload);
    },
    upsertEntry(state, action: PayloadAction<LocaleEntry>) {
      entryAdapter.upsertOne(state.entries, action.payload);
    },
    removeEntry(state, action: PayloadAction<string>) {
      entryAdapter.removeOne(state.entries, action.payload);
    },
  },

  selectors: {
    currentLocale: (state) => state.currentLocale,
    selectEntry: (state, key: string): LocaleEntry | undefined =>
      state.entries.entities[key],
    allEntries: (state): LocaleEntry[] =>
      state.entries.ids.map((id) => state.entries.entities[id] as LocaleEntry),
  },
});

export const actions = slice.actions;
export const selectors = slice.selectors;
