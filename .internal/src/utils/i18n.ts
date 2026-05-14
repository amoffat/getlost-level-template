import { codeToLanguage } from "@/constants/locale";
import { SupportedLang, supportedLangs } from "@/types/i18n";
import { CSSProperties } from "react";
import { log } from "../log";

// These fallbacks apply on a per-key basis.
export const fallbacks: Partial<Record<string, SupportedLang[]>> = {
  zh: ["zh-cn"],
  "zh-hk": ["zh-tw", "zh-cn"],
  "zh-mo": ["zh-tw", "zh-cn"],
  pt: ["pt-br"],
  // Falling back to "en" means missing languages will default to English. And
  // eventually falling back to main allows our local development environment to
  // work without needing to translate to "en"
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

export function resolveLangName(lang: string): string | undefined {
  let name =
    codeToLanguage[lang as SupportedLang] ??
    codeToLanguage[normLang(lang) as SupportedLang];
  if (!name) {
    for (const fallback of fallbacks[lang as SupportedLang] ??
      fallbacks.default!) {
      name =
        codeToLanguage[fallback] ??
        codeToLanguage[normLang(fallback) as SupportedLang];
      if (name) break;
    }
  }
  return name;
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
