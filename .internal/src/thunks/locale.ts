import { mainLocale } from "@/constants";
import { codeToLanguage } from "@/constants/locale";
import { actions } from "@/slices/locale";
import { clearLocaleReferences } from "@/store/middleware/locale/references";
import type { AppDispatch, RootState } from "@/store/store";
import { allLocales, SupportedLang } from "@/types/i18n";
import type { LocaleEntry } from "@/types/locale";
import type { PartialNullable } from "@/types/util";
import { computeSourceHash, isSourceEdit } from "@/utils/locale";
import { notifications } from "@mantine/notifications";
import { createAsyncThunk } from "@reduxjs/toolkit";
import i18next from "i18next";

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
 * How an upsert affects the *reference* stored on the owning object (contentKey
 * / nameKey / textKey / …). The thunk owns the source-vs-translation routing
 * decision, so it — not the caller — determines whether the reference changes:
 * - `"created"`   — a brand-new source entry was minted; store its id (the `id`
 *   you passed in) as the reference.
 * - `"cleared"`   — the source text was emptied; clear the reference.
 * - `"unchanged"` — leave the reference as-is (edited an existing entry, or a
 *   translation edit, which never changes identity).
 */
export type UpsertLocaleResult = "created" | "cleared" | "unchanged";

/**
 * Syncs a locale text field to the store, as a thunk. Identity (`id`) is stable
 * — it is minted once when an entry is first created and never rotates on edit.
 *
 * Dispatch it (`dispatch(upsertLocaleEntry({ … }))`); the return value is an
 * `UpsertLocaleResult` telling the caller what to do with the reference the
 * owning object stores for this field.
 *
 * Whether an edit is a source edit or a translation is decided per-string from
 * the source (`main`) entry's `srcLang`: editing in the string's own source
 * language (or creating a new string) writes the source; any other language
 * writes a translation. See `isSourceEdit` below.
 */
export const upsertLocaleEntry =
  (patch: PartialNullable<LocaleEntry> & { id: string }) =>
  (
    dispatch: AppDispatch,
    getState: () => RootState,
  ): UpsertLocaleResult => {
    const state = getState();
    const locale = state.locale.activeLocale;

    const id = patch.id;
    const mainEntry: LocaleEntry | undefined =
      state.locale.entries[mainLocale].entities[id];
    const prevEntry: LocaleEntry | undefined =
      state.locale.entries[locale].entities[id];

    const srcLang = mainEntry?.srcLang ?? locale;

    // A source edit either creates a brand-new source string (no main entry
    // yet), edits an existing string in its own authored language, or explicitly
    // targets the `main` bucket. Anything else is a translation into `locale`.
    // Source edits are always stored in `main`; the active language is recorded
    // as `srcLang`. See `isSourceEdit` for the shared routing rule.
    const sourceEdit = isSourceEdit(mainEntry);

    // Clearing the source text drops the reference (source edits only). A cleared
    // translation must never remove the shared, locale-independent identity.
    if (patch.v === null) {
      return sourceEdit ? "cleared" : "unchanged";
    }

    if (sourceEdit) {
      const existing = prevEntry ?? mainEntry;
      const v = patch.v ?? existing?.v ?? "";
      const hash = computeSourceHash(v);

      dispatch(
        actions.upsertEntry({
          locale: mainLocale,
          entry: { ...patch, id, srcLang, hash },
        }),
      );

      // Reflect the source write in the active locale bucket immediately so
      // views bound to it (e.g. the Translations grid) show it without a reload.
      // Source rows for the active language mirror the main entry.
      dispatch(
        actions.upsertEntry({
          locale,
          entry: {
            id,
            v,
            hash,
            ctx: patch.ctx ?? existing?.ctx,
          },
        }),
      );

      // Only signal a reference change when a brand-new entry was created.
      return existing ? "unchanged" : "created";
    } else {
      // Should never happen: without a main entry we take the source-edit
      // branch. Kept for typescript linting.
      if (!prevEntry && !mainEntry) return "unchanged";

      dispatch(
        actions.upsertEntry({
          locale,
          entry: {
            // Persist original + the source hash this translation matches, so we
            // can both show translators the source text and detect staleness.
            original: mainEntry.v,
            hash: mainEntry.hash,
            ...patch,
            id,
          },
        }),
      );
      return "unchanged";
    }
  };

/**
 * Load dialogue locale files for every locale in parallel — including the
 * `main` source locale. Locales with no file (404) are silently stored as empty.
 */
export const loadAllLocalesThunk = createAsyncThunk(
  "locale/loadAll",
  async (_, { dispatch }) => {
    await Promise.all(
      allLocales.map(async (locale) => {
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

    // Then remove the entries from every locale bucket (including `main`). This
    // keeps the store consistent and triggers the locale autosave, which prunes
    // them from disk.
    for (const locale of allLocales) {
      for (const id of ids) {
        dispatch(actions.removeEntry({ locale, key: id }));
      }
    }
  },
);

/**
 * Set the `pin` flag on locale entries by id. Pinned entries are exempt from
 * autosave pruning (see `store/middleware/locale/autosave.ts`), so this is how
 * authors mark an existing entry to survive without any object reference — or
 * drop that exemption again.
 *
 * The flag is authoritative on the main (source) entry only, so writes always
 * target the default locale regardless of which locale is currently displayed.
 * Being an `upsertEntry`, each write triggers the autosave/prune pass.
 */
export const setEntriesPinThunk = createAsyncThunk(
  "locale/setPin",
  async (
    { ids, pin }: { ids: string[]; pin: boolean },
    { dispatch, getState },
  ) => {
    if (ids.length === 0) return;
    const mainEntities =
      (getState() as RootState).locale.entries[mainLocale]?.entities ?? {};
    for (const id of ids) {
      // Only entries that exist in the source locale can be pinned; a bare
      // {id, pin} upsert must never mint a phantom main entry.
      if (mainEntities[id]) {
        dispatch(
          actions.upsertEntry({ locale: mainLocale, entry: { id, pin } }),
        );
      }
    }
  },
);

/**
 * Set the single active language. It drives everything at once: the editor UI
 * chrome (i18next), the dialogue view, and the language new source strings are
 * authored in (`activeLocale` is used as `srcLang` when authoring). Untranslated
 * editor-UI strings fall back to English via i18next's configured fallbacks.
 */
export const setLanguageThunk = createAsyncThunk(
  "locale/setLanguage",
  async (locale: SupportedLang, { dispatch }) => {
    // Load this language's dialogue before switching the view to it.
    await dispatch(loadDialogueLocaleThunk(locale)).unwrap();
    dispatch(actions.setActiveLocale(locale));
    await i18next.changeLanguage(locale);
    notifications.show({
      title: "Language changed",
      message: `Now editing in ${codeToLanguage[locale]}`,
    });
  },
);
