import { supportedLangs } from "@/types/i18n";
import { CSSProperties } from "react";
import { log } from "../log";

// These fallbacks apply on a per-key basis. i18next uses a specific entry
// *instead of* `default` (it never appends default), and it resolves a region
// code with no own entry via its language part — so "pt-br" also picks up the
// "pt" entry. Every list must therefore END with the "en" → "main" chain, or
// the language dead-ends and `t()` returns raw keys (e.g. pt/pt-br had this bug
// because their chain terminated at the untranslated "pt-br").
//
// Falling back to "en" means missing languages default to English; falling back
// to "main" lets local development work without translating to "en" first.
// Values are locale codes (which include the internal "main" source locale, not
// a user-facing language), so they are typed as plain strings.
export const fallbacks: Partial<Record<string, string[]>> = {
  zh: ["zh-cn", "en", "main"],
  "zh-hk": ["zh-tw", "zh-cn", "en", "main"],
  "zh-mo": ["zh-tw", "zh-cn", "en", "main"],
  pt: ["pt-br", "en", "main"],
  default: ["en", "main"],
};

// This routes a language code early in the process, to avoid unnecessary
// lookups.
export function routeLang(langOrLocale: string): string {
  const lang = normLang(langOrLocale);
  if (lang === "en") {
    return "en";
  }
  if (!supportedLangs.find((l) => l === lang)) {
    return "en";
  }

  return langOrLocale;
}

export function normLang(lang: string): string {
  // Normalize language codes to lowercase and use only the first part if
  // region is present (e.g. 'pt-br' -> 'pt')
  return lang.toLowerCase().replace("_", "-").split("-")[0];
}

export function langDirection(lang: string): CSSProperties["direction"] {
  return ["ar", "he"].includes(normLang(lang)) ? "rtl" : "ltr";
}

export function levelNs(levelId: string, commit: string): string {
  return `level:${levelId}/${commit}`;
}

export function jsonLinesParse(data: string): Record<string, string> {
  const lines = data.split("\n").filter((line) => line.trim() !== "");
  const result: Record<string, string> = {};
  for (const line of lines) {
    try {
      const obj = JSON.parse(line);
      if (typeof obj.k === "string" && typeof obj.v === "string") {
        result[obj.k] = obj.v;
      }
    } catch (error) {
      log.error({ error }, `Failed to parse JSON line: ${line}`);
      return {};
    }
  }
  return result;
}
