export const codeToFlag = {
  "pt-br": "🇧🇷",
  "zh-cn": "🇨🇳",
  "zh-tw": "🇹🇼",
  ar: "🇸🇦",
  de: "🇩🇪",
  en: "🇺🇸",
  es: "🇪🇸",
  fr: "🇫🇷",
  id: "🇮🇩",
  it: "🇮🇹",
  ja: "🇯🇵",
  ko: "🇰🇷",
  main: "🇦🇰",
  pl: "🇵🇱",
  pt: "🇵🇹",
  ru: "🇷🇺",
  th: "🇹🇭",
  tr: "🇹🇷",
  vi: "🇻🇳",
  zh: "🇨🇳",
} as const;

export const codeToLanguage = {
  main: "Your language",
  en: "English", // English
  es: "Español", // Spanish
  pt: "Português", // Portuguese
  "pt-br": "Português", // Brazilian Portuguese
  fr: "Français", // French
  de: "Deutsch", // German
  it: "Italiano", // Italian
  ru: "Русский", // Russian
  ja: "日本語", // Japanese
  ko: "한국어", // Korean
  zh: "简体中文", // Simplified Chinese
  "zh-cn": "简体中文", // Simplified Chinese
  "zh-tw": "繁體中文", // Traditional Chinese
  ar: "العربية", // Arabic
  tr: "Türkçe", // Turkish
  pl: "Polski", // Polish
  th: "ไทย", // Thai
  vi: "Tiếng Việt", // Vietnamese
  id: "Bahasa Indonesia", // Indonesian
} as const;
export type SupportedLang = keyof typeof codeToLanguage;
export const supportedLangs = Object.keys(codeToLanguage) as SupportedLang[];
