import i18next from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import HttpBackend from "i18next-http-backend";
import { initReactI18next } from "react-i18next";
import { fallbacks, jsonLinesParse, routeLang } from "./utils/i18n.ts";

await i18next
  // Detect the user's language from querystring or browser settings
  .use(
    new LanguageDetector(null, {
      caches: [],
      order: ["navigator"],
      convertDetectedLanguage: routeLang,
    }),
  )
  .use(
    new HttpBackend(null, {
      loadPath: `${import.meta.env.BASE_URL}locales/system/{{lng}}/{{ns}}.jsonl`,
      parse: jsonLinesParse,
    }),
  )
  .use(initReactI18next)
  .init({
    postProcess: ["sanitizeTranslation"],
    load: "all",
    lowerCaseLng: true,
    cleanCode: true,
    fallbackLng: fallbacks as Record<string, string[]>,
    ns: ["shell"],
    fallbackNS: "shell",
    interpolation: {
      // React will handle escaping.
      escapeValue: false,
    },
    react: {
      useSuspense: true,
      nsMode: "fallback",
    },
  });

import("./shell.tsx");
