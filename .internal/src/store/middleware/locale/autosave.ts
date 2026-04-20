import { autosaveLocaleDebounce, defaultLocale } from "@/constants";
import { log } from "@/log";
import { saveLocaleFile } from "@/persist/locale/api";
import { slice as dialogueSlice } from "@/slices/dialogue";
import {
  actions as localeActions,
  slice as localeSlice,
} from "@/slices/locale";
import { slice as mapEditorSlice } from "@/slices/mapEditor";
import { selectPropertyValue } from "@/store/selectors";
import { type RootState } from "@/store/store";
import type { LocaleEntry } from "@/types/locale";
import { MapObj } from "@/types/map";
import { AppStartListening } from "@/types/redux";
import { createListenerMiddleware } from "@reduxjs/toolkit";
import { EMPTY, from, Subject } from "rxjs";
import { catchError, concatMap, debounceTime } from "rxjs/operators";

const LOCALE_FILE = "dialogue";

const listenerMiddleware = createListenerMiddleware();

/** One Subject per locale so debouncing is independent per file. */
const subjectsByLocale = new Map<string, Subject<LocaleEntry[]>>();

function getSubject(locale: string): Subject<LocaleEntry[]> {
  let subject = subjectsByLocale.get(locale);
  if (!subject) {
    subject = new Subject<LocaleEntry[]>();
    subject
      .pipe(
        debounceTime(autosaveLocaleDebounce),
        concatMap((entries) =>
          from(saveLocaleFile(locale, LOCALE_FILE, entries)).pipe(
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

// Actions that represent a fresh load from disk — triggering a sync in
// response to these would race against the load and could corrupt the file.
const loadActionTypes = new Set<string>([
  localeActions.setDefaultEntries.type,
  localeActions.setActiveEntries.type,
  "locale/loadDialogue/pending",
  "locale/loadDialogue/fulfilled",
  "locale/loadDialogue/rejected",
  dialogueSlice.actions.setDialogues.type,
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
    if (obj && Object.hasOwn(obj, "nameKey")) {
      const nameKey = selectPropertyValue<MapObj, { nameKey: string }>(
        state,
        obj,
        "nameKey",
      );
      if (nameKey) keys.add(nameKey);
    }
  }

  return keys;
}

const startAppListening =
  listenerMiddleware.startListening as AppStartListening;

startAppListening({
  predicate: (action) => {
    if (loadActionTypes.has(action.type)) return false;
    return (
      action.type.startsWith(localeSlice.name) ||
      action.type.startsWith(dialogueSlice.name) ||
      action.type.startsWith(mapEditorSlice.name)
    );
  },
  effect: async (_action, { getState }) => {
    const state = getState();
    const liveKeys = collectLiveKeys(state);
    const currentLocale = state.locale.currentLocale;

    // Sync default locale entries
    const defaultEntries = (state.locale.defaultEntries.ids as string[])
      .map((k) => state.locale.defaultEntries.entities[k])
      .filter((e): e is LocaleEntry => !!e && liveKeys.has(e.k));
    getSubject(defaultLocale).next(defaultEntries);

    // Sync active locale entries if it differs from the default
    if (currentLocale !== defaultLocale) {
      const activeEntries = (state.locale.activeEntries.ids as string[])
        .map((k) => state.locale.activeEntries.entities[k])
        .filter((e): e is LocaleEntry => !!e && liveKeys.has(e.k));
      getSubject(currentLocale).next(activeEntries);
    }
  },
});

export default listenerMiddleware.middleware;
