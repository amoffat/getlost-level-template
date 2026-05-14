import { codeToLanguage } from "@/constants/locale";

export type SupportedLang = keyof typeof codeToLanguage;
export const supportedLangs = Object.keys(codeToLanguage) as SupportedLang[];
