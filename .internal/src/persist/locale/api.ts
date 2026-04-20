import type { LocaleEntry } from "@/types/locale";

export async function saveLocaleFile(
  locale: string,
  file: string,
  entries: LocaleEntry[],
): Promise<void> {
  const res = await fetch(`/level/locales/${locale}/${file}.jsonl`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entries),
  });
  if (!res.ok) {
    throw new Error(`Failed to save locale file ${locale}/${file}: ${res.status}`);
  }
}
