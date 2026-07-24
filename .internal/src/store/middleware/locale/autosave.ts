import { autosaveLocaleDebounce, defaultLocale } from "@/constants";
import { LOCALE_FILE } from "@/constants/locale";
import { log } from "@/log";
import { saveLocaleFile } from "@/persist/locale/api";
import { actions as localeActions } from "@/slices/locale";
import { selectPropertyValue } from "@/store/selectors";
import { type RootState } from "@/store/store";
import { supportedLangs } from "@/types/i18n";
import type { LocaleEntry, LocaleStatePayload } from "@/types/locale";
import { isPickupObj, isSpeakableObject } from "@/types/map";
import { isNpcTemplate } from "@/types/npc";
import { AppStartListening } from "@/types/redux";
import { isTileGroupTemplate } from "@/types/tilegroup";
import { computeSourceHash } from "@/utils/locale";
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
 * - Missing entries are seeded with v, original, hash, and ctx from main.
 * - Existing entries keep their translated v AND their own `hash` (the source
 *   version this translation was written against — the staleness anchor), but
 *   have `original` and `ctx` refreshed from main.
 */
function mergeNonMainEntries(
  mainEntries: LocaleEntry[],
  existingEntries: LocaleEntry[],
): LocaleEntry[] {
  const existingMap = new Map(existingEntries.map((e) => [e.id, e]));
  return mainEntries.map((mainEntry) => {
    const current = existingMap.get(mainEntry.id);
    if (current) {
      const updated: LocaleEntry = { ...current, original: mainEntry.v };
      if ("ctx" in mainEntry && mainEntry.ctx !== undefined) {
        updated.ctx = mainEntry.ctx;
      } else {
        delete updated.ctx;
      }
      return updated;
    } else {
      const seeded: LocaleEntry = {
        id: mainEntry.id,
        v: mainEntry.v,
        original: mainEntry.v,
        hash: mainEntry.hash,
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
    } else if (isPickupObj(obj)) {
      const nameKey = selectPropertyValue(state, obj, "nameKey");
      if (nameKey) keys.add(nameKey);

      const descKey = selectPropertyValue(state, obj, "descriptionKey");
      if (descKey) keys.add(descKey);
    }
  }

  // Tileset objects
  for (const ts of Object.values(state.tilesetEditor.tilesets)) {
    for (const objId of ts.tiles.ids) {
      const obj = ts.tiles.entities[objId as string];
      if (!obj) continue;
      if (isNpcTemplate(obj) || isTileGroupTemplate(obj)) {
        if (obj.nameKey) keys.add(obj.nameKey);
      }
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
    const allEntries: LocaleStatePayload[] = [];

    for (const locale of supportedLangs) {
      getSubject(locale).next(() => {
        // Important that state is snapshotted at the time the entries are being
        // fetched to be saved.
        const state = getState();

        // Find all main entries that are *live*, meaning, used by some object
        // in the map/dialogue/story. If they're not live, we don't want to save
        // them, so filter them out.
        const liveKeys = collectLiveKeys(state);
        const mainLocaleState = state.locale.entries[defaultLocale];
        const mainEntries = mainLocaleState
          ? (mainLocaleState.ids as string[])
              .map((k) => mainLocaleState.entities[k])
              .filter((e): e is LocaleEntry => !!e && liveKeys.has(e.id))
              // Recompute each main entry's source hash from its current text so
              // the persisted hash (and every translation's staleness check
              // against it) is always in sync, no matter how it was edited.
              .map((e) => ({ ...e, hash: computeSourceHash(e.v) }))
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
        allEntries.push({ locale, entries: merged });
        return merged;
      });
    }
    dispatch(localeActions.setAllLocaleEntries(allEntries));
  },
});

export default listenerMiddleware.middleware;
