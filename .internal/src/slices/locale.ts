import { defaultLocale } from "@/constants";
import { SupportedLang } from "@/types/i18n";
import type { LocaleEntry, LocaleStatePayload } from "@/types/locale";
import { PartialNullable } from "@/types/util";
import {
  createEntityAdapter,
  createSelector,
  createSlice,
  EntityState,
  PayloadAction,
} from "@reduxjs/toolkit";
import i18next from "i18next";

const entryAdapter = createEntityAdapter<LocaleEntry, string>({
  selectId: (entry) => entry.id,
});

type LocaleEntityState = EntityState<LocaleEntry, string>;

interface LocaleState {
  activeLocale: SupportedLang;
  userLocale: SupportedLang;
  /** All loaded locale entries, keyed by locale string. */
  entries: Record<string, LocaleEntityState>;
}

/**
 * Return the entity bucket for a locale, or a fresh empty one if it does not
 * exist yet. This does NOT assign the bucket into state — callers must assign
 * the entity-adapter operation's *return value* back to `state.entries[locale]`.
 *
 * Why: under Immer, a freshly-assigned plain object read back inside the same
 * producer is not a draft, so an entity-adapter op on it runs in immutable mode
 * and returns a new bucket instead of mutating in place. Assigning that return
 * value back is the only pattern that works for both first-time creation and
 * subsequent edits.
 */
function localeBucket(state: LocaleState, locale: string): LocaleEntityState {
  return state.entries[locale] ?? entryAdapter.getInitialState();
}

export interface RowStatus {
  /** The translated value still equals the source text (never translated). */
  untranslated: boolean;
  /** The source text changed since this translation was written (hash drift). */
  outOfDate: boolean;
  /** Either untranslated or out of date — needs a translator's attention. */
  needsAttention: boolean;
}

/**
 * Compute the translation status of a non-main entry relative to its main
 * (source) counterpart. `mainEntry` is looked up by the same id.
 */
function computeRowStatus(
  entry: LocaleEntry,
  mainEntry: LocaleEntry | undefined,
): RowStatus {
  const untranslated =
    entry.original !== undefined && entry.v === entry.original;
  const outOfDate =
    entry.hash !== undefined &&
    mainEntry?.hash !== undefined &&
    entry.hash !== mainEntry.hash;
  return {
    untranslated,
    outOfDate,
    needsAttention: untranslated || outOfDate,
  };
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

    setEntries(state, action: PayloadAction<LocaleStatePayload>) {
      const { locale, entries } = action.payload;
      state.entries[locale] = entryAdapter.setAll(
        localeBucket(state, locale),
        entries,
      );
    },

    setAllLocaleEntries(state, action: PayloadAction<LocaleStatePayload[]>) {
      for (const { locale, entries } of action.payload) {
        state.entries[locale] = entryAdapter.setAll(
          localeBucket(state, locale),
          entries,
        );
      }
    },

    upsertEntry(
      state,
      action: PayloadAction<{
        locale: string;
        entry: PartialNullable<LocaleEntry> & { id: string };
      }>,
    ) {
      const { locale, entry } = action.payload;
      // `upsertOne` shallow-merges onto any existing entry, so an explicitly
      // `undefined` field would clobber a stored value (e.g. wiping `ctx` on a
      // plain text edit). Drop undefined keys before merging; `null` is kept,
      // since callers use it to intentionally clear a field.
      const patch = { ...entry };
      for (const key of Object.keys(patch) as (keyof typeof patch)[]) {
        if (patch[key] === undefined) delete patch[key];
      }
      state.entries[locale] = entryAdapter.upsertOne(
        localeBucket(state, locale),
        patch as LocaleEntry,
      );
    },

    removeEntry(state, action: PayloadAction<{ locale: string; key: string }>) {
      const { locale, key } = action.payload;
      if (state.entries[locale]) {
        state.entries[locale] = entryAdapter.removeOne(
          state.entries[locale],
          key,
        );
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
      key: string | undefined | null,
    ): LocaleEntry | undefined =>
      key ? state.entries[defaultLocale]?.entities[key] : undefined,
    selectDefaultEntries: (state) =>
      state.entries[defaultLocale]?.entities ?? {},
    /** All entries for the given locale, as a dict keyed by id. */
    selectEntriesForLocale: (state, locale: string) =>
      state.entries[locale]?.entities ?? {},
    /** Translation status (untranslated / out-of-date) for a single entry. */
    selectRowStatus: (state, locale: string, id: string): RowStatus => {
      const entry = state.entries[locale]?.entities[id];
      if (!entry) {
        return { untranslated: false, outOfDate: false, needsAttention: false };
      }
      const mainEntry = state.entries[defaultLocale]?.entities[id];
      return computeRowStatus(entry, mainEntry);
    },
    /**
     * For each non-default loaded locale, returns the count of entries that
     * need a translator's attention — either untranslated (`v` still equals
     * `original`) or out of date (its stored source `hash` no longer matches
     * the main entry's current `hash`).
     */
    needsAttentionCounts: createSelector(
      [(state: LocaleState) => state.entries],
      (entries): Partial<Record<SupportedLang, number>> => {
        const result: Partial<Record<SupportedLang, number>> = {};
        const mainEntities = entries[defaultLocale]?.entities ?? {};
        for (const [locale, entityState] of Object.entries(entries)) {
          if (locale === defaultLocale) continue;
          let count = 0;
          for (const id of entityState.ids as string[]) {
            const entry = entityState.entities[id];
            if (!entry) continue;
            if (computeRowStatus(entry, mainEntities[entry.id]).needsAttention) {
              count++;
            }
          }
          result[locale as SupportedLang] = count;
        }
        return result;
      },
    ),
  },
});

export const actions = slice.actions;
export const selectors = slice.selectors;
