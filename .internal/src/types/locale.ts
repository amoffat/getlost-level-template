export interface LocaleEntry {
  k: string;
  v: string;
  original?: string;
  ctx?: string;
}

export interface LocaleStatePayload {
  locale: string;
  entries: LocaleEntry[];
}
