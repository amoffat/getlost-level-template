import { mainLocale } from "@/constants";
import { codeToLanguage } from "@/constants/locale";

export type SupportedLang = keyof typeof codeToLanguage;

/** User-facing languages. Does NOT include the internal `main` source locale. */
export const supportedLangs = Object.keys(codeToLanguage) as SupportedLang[];

/**
 * Every on-disk locale bucket, including the internal `main` source locale.
 * Use this (not `supportedLangs`) whenever loading, saving, or deleting locale
 * files — `main` is a real bucket on disk even though it is not a language a
 * user can pick.
 */
export const allLocales: string[] = [mainLocale, ...supportedLangs];
