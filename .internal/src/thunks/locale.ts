import { defaultLocale } from "@/constants";
import { SupportedLang, supportedLangs } from "@/constants/locale";
import { actions } from "@/slices/locale";
import type { RootState } from "@/store/store";
import type { DNode } from "@/types/dialogue";
import type { LocaleEntry } from "@/types/locale";
import { PartialNullable } from "@/types/util";
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
 * Load the dialogue locale file for the given locale.
 *
 * - When `locale` is the default locale: fetches its entries, populates both
 *   `defaultEntries` and `activeEntries` with the same data. This is called
 *   once at editor init (via `loadStoryThunk`) and whenever the user switches
 *   back to the default locale.
 * - When `locale` is a non-default locale: fetches its entries, sets
 *   `activeEntries`, and prunes any orphaned keys (present in the locale file
 *   but absent from `defaultEntries`) from disk.
 */
export const loadDialogueLocaleThunk = createAsyncThunk(
  "locale/loadDialogue",
  async (locale: string, { dispatch, getState }) => {
    if (locale === defaultLocale) {
      const entries = await fetchEntries(defaultLocale);
      dispatch(actions.setDefaultEntries(entries));
      dispatch(actions.setActiveEntries(entries));
      return;
    }

    const state = getState() as RootState;
    const mainKeys = new Set(state.locale.defaultEntries.ids as string[]);

    const localeEntries = await fetchEntries(locale);
    const validEntries = localeEntries
      .filter((e) => mainKeys.has(e.k))
      .map((e) => {
        if (!e.ctx) {
          delete e.ctx;
        }
        return e;
      });
    const orphanKeys = localeEntries
      .filter((e) => !mainKeys.has(e.k))
      .map((e) => e.k);

    dispatch(actions.setActiveEntries(validEntries));

    await Promise.all(
      orphanKeys.map((key) =>
        fetch(entryUrl(locale, key), { method: "DELETE" }),
      ),
    );
  },
);

/**
 * Patch a single locale entry for the given locale.
 * Accepts a partial entry (must include `k`). Merges with the existing Redux
 * entry optimistically, then persists the patch to the API via PATCH.
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
    await fetch(entryUrl(locale, entry.k), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });
  },
);

/**
 * Remove a locale entry by key from the given locale.
 * Updates Redux store optimistically, then persists to the API.
 *
 * Removes from `defaultEntries` when `locale` is the default locale.
 * Removes from `activeEntries` when `locale` matches the current active locale.
 */
export const removeLocaleEntryThunk = createAsyncThunk(
  "locale/removeEntry",
  async (
    { locale, key }: { locale: string; key: string },
    { dispatch, getState },
  ) => {
    if (locale === defaultLocale) {
      dispatch(actions.removeDefaultEntry(key));
    }
    const state = getState() as RootState;
    if (locale === state.locale.currentLocale) {
      dispatch(actions.removeActiveEntry(key));
    }
    await fetch(entryUrl(locale, key), { method: "DELETE" });
  },
);

export const setLocaleThunk = createAsyncThunk(
  "locale/set",
  async (locale: SupportedLang, { dispatch }) => {
    await dispatch(loadDialogueLocaleThunk(locale)).unwrap();
    dispatch(actions.setCurrentLocale(locale));
  },
);

/**
 * Remove all locale entries associated with a set of dialogue nodes across
 * every supported locale.
 *
 * Cleans up `contentKey` and every `choices[].textKey` for each node.
 * `speakerNameKey` is intentionally excluded — it is a plain-text hash shared
 * across every node that uses the same speaker, so removing it here would
 * silently break other nodes.
 */
export const cleanupNodeLocaleEntriesThunk = createAsyncThunk(
  "locale/cleanupNodes",
  async ({ nodes }: { nodes: DNode[] }, { dispatch }) => {
    const promises: Promise<void>[] = [];
    for (const node of nodes) {
      const keysToRemove: string[] = [];
      if (node.data.contentKey) keysToRemove.push(node.data.contentKey);
      for (const choice of node.data.choices) {
        if (choice.textKey) keysToRemove.push(choice.textKey);
      }
      for (const locale of supportedLangs) {
        for (const key of keysToRemove) {
          promises.push(
            dispatch(removeLocaleEntryThunk({ locale, key })).unwrap(),
          );
        }
      }
    }
    await Promise.all(promises);
  },
);
