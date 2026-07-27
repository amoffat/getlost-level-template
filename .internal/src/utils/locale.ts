import * as constants from "@/constants";
import { store } from "@/store/store";
import type { LocaleEntry } from "@/types/locale";
import { x64 } from "murmurhash3js";
import { v4 as uuidv4 } from "uuid";

export type LocaleEntryMap = Record<string, LocaleEntry | undefined>;

/**
 * Full (128-bit) murmur hash of a source string, as a 32-char hex string.
 *
 * Stored on each entry as `hash` and used ONLY to detect whether a translation
 * is out of date — i.e. whether the source text changed since the translation
 * was written. It is deliberately NOT an identity (see `newLocaleId`) and it
 * intentionally covers the text only, not the context, so editing a string's
 * translator context does not mark existing translations stale.
 */
export function computeSourceHash(text: string): string {
  return x64.hash128(text);
}

/** Mint a fresh, stable identity for a new locale entry. */
export function newLocaleId(): string {
  return uuidv4();
}

/**
 * The real language a source string is authored in, read from its `main`
 * entry. Legacy entries (and missing entries) fall back to `defaultSourceLang`.
 */
export function sourceLangOf(mainEntry: LocaleEntry | undefined): string {
  return mainEntry?.srcLang ?? constants.defaultSourceLang;
}

/**
 * Whether editing a string in `activeLocale` writes the *source* (`main`) entry
 * rather than a translation. Editing a string in its own authored language — or
 * one that has no source entry / no recorded `srcLang` yet — is a source edit;
 * any other language is a translation.
 *
 * Note the `srcLang` fallback is the *active* locale (not `defaultSourceLang`),
 * so an untagged existing entry counts as a source edit in whatever language
 * it's being edited. This is the single source of truth for the routing in
 * `upsertLocaleEntry`; keep the two in lockstep.
 */
export function isSourceEdit(mainEntry: LocaleEntry | undefined): boolean {
  const state = store.getState();
  const activeLocale = state.locale.activeLocale;
  const srcLang = mainEntry?.srcLang ?? activeLocale;
  return !mainEntry || activeLocale === srcLang;
}

export function resolveLocaleText({
  key,
  primaryEntries,
  fallbackEntries,
  defaultText = "",
}: {
  /** Can be null or undefined in cases where we're looking at a cascading
   * object property, where null signifies deliberately unset, and undefined
   * signifies look at the template object */
  key: string | null | undefined;
  primaryEntries: LocaleEntryMap;
  fallbackEntries?: LocaleEntryMap;
  defaultText?: string;
}): string {
  if (!key) {
    return defaultText;
  }

  return primaryEntries[key]?.v ?? fallbackEntries?.[key]?.v ?? defaultText;
}
