import { autosaveLocaleDebounce, defaultLocale } from "@/constants";
import { LOCALE_FILE } from "@/constants/locale";
import { log } from "@/log";
import { saveLocaleFile } from "@/persist/locale/api";
import { actions as localeActions } from "@/slices/locale";
import { selectPropertyValue } from "@/store/selectors";
import { type RootState } from "@/store/store";
import { supportedLangs } from "@/types/i18n";
import type { LocaleEntry } from "@/types/locale";
import { isSpeakableObject } from "@/types/map";
import { AppStartListening } from "@/types/redux";
import { createListenerMiddleware } from "@reduxjs/toolkit";
import { EMPTY, from, Subject } from "rxjs";
import { catchError, concatMap, debounceTime } from "rxjs/operators";

const listenerMiddleware = createListenerMiddleware();

/** One Subject per locale so debouncing is independent per file. */
const subjectsByLocale = new Map<string, Subject<() => LocaleEntry[]>>();

function getSubject(locale: string): Subject<() => LocaleEntry[]> {
  let subject = subjectsByLocale.get(locale);
  if (!subject) {
    subject = new Subject<() => LocaleEntry[]>();
    subject
      .pipe(
        debounceTime(autosaveLocaleDebounce),
        concatMap((getEntries) =>
          from(saveLocaleFile(locale, LOCALE_FILE, getEntries())).pipe(
            catchError((e) => {
              log.error({ e }, "Locale autosave failed for locale %s", locale);
              return EMPTY;
            }),
          ),
        ),
      )
      .subscribe();
    subjectsByLocale.set(locale, subject);
  }
  return subject;
}

/**
 * Merge main-locale entries into a non-main locale's existing entries.
 * - Entries absent from main are dropped (stale removal).
 * - Missing entries are seeded with v, original, and ctx from main.
 * - Existing entries keep their translated v, but have ctx overwritten from main.
 */
function mergeNonMainEntries(
  mainEntries: LocaleEntry[],
  existingEntries: LocaleEntry[],
): LocaleEntry[] {
  const existingMap = new Map(existingEntries.map((e) => [e.k, e]));
  return mainEntries.map((mainEntry) => {
    const current = existingMap.get(mainEntry.k);
    if (current) {
      const updated: LocaleEntry = { ...current };
      if ("ctx" in mainEntry && mainEntry.ctx !== undefined) {
        updated.ctx = mainEntry.ctx;
      } else {
        delete updated.ctx;
      }
      return updated;
    } else {
      const seeded: LocaleEntry = {
        k: mainEntry.k,
        v: mainEntry.v,
        original: mainEntry.v,
      };
      if ("ctx" in mainEntry && mainEntry.ctx !== undefined) {
        seeded.ctx = mainEntry.ctx;
      }
      return seeded;
    }
  });
}

// Actions that represent a fresh load from disk — triggering a sync in
// response to these would race against the load and could corrupt the file.
const loadActionTypes = new Set<string>([
  localeActions.upsertEntry.type,
  localeActions.removeEntry.type,
]);

/** Collect all locale keys that are currently referenced by live state. */
function collectLiveKeys(state: RootState): Set<string> {
  const keys = new Set<string>();

  // Dialogue nodes: speakerNameKey, contentKey, choices[].textKey
  for (const dlgId of state.dialogue.dialogues.ids) {
    const dlg = state.dialogue.dialogues.entities[dlgId as string];
    if (!dlg) continue;
    for (const nodeId of dlg.nodes.ids) {
      const node = dlg.nodes.entities[nodeId as string];
      if (!node) continue;
      if (node.data.speakerNameKey) keys.add(node.data.speakerNameKey);
      if (node.data.contentKey) keys.add(node.data.contentKey);
      for (const choice of node.data.choices) {
        if (choice.textKey) keys.add(choice.textKey);
      }
    }
  }

  // Map objects
  for (const objId of state.mapEditor.objects.ids) {
    const obj = state.mapEditor.objects.entities[objId as string];
    if (isSpeakableObject(obj)) {
      const nameKey = selectPropertyValue(state, obj, "nameKey");
      if (nameKey) keys.add(nameKey);
    }
  }

  return keys;
}

const startAppListening =
  listenerMiddleware.startListening as AppStartListening;

startAppListening({
  predicate: (action) => {
    return loadActionTypes.has(action.type);
  },
  effect: async (_action, { dispatch, getState }) => {
    for (const locale of supportedLangs) {
      getSubject(locale).next(() => {
        const state = getState();

        // Find all main entries that are *live*, meaning, used by some object
        // in the map/dialogue/story. If they're not live, we don't want to save
        // them, so filter them out.
        const liveKeys = collectLiveKeys(state);
        const mainLocaleState = state.locale.entries[defaultLocale];
        const mainEntries = mainLocaleState
          ? (mainLocaleState.ids as string[])
              .map((k) => mainLocaleState.entities[k])
              .filter((e): e is LocaleEntry => !!e && liveKeys.has(e.k))
          : [];

        if (locale === defaultLocale) {
          return mainEntries;
        }

        const localeEntityState = state.locale.entries[locale];
        const existingEntries = (localeEntityState.ids as string[])
          .map((k) => localeEntityState.entities[k])
          .filter((e): e is LocaleEntry => !!e);

        // Merge with main, so the locale's entries are up to date with main's
        // entries.
        const merged = mergeNonMainEntries(mainEntries, existingEntries);

        // Now that we have an authoritative view of the entries (because it's
        // going to be written to the locale's file), let's go ahead and set the
        // locale's entries.
        dispatch(localeActions.setEntries({ locale, entries: merged }));
        return merged;
      });
    }
  },
});

export default listenerMiddleware.middleware;
