// Shared helpers for the `locales` skill scripts.
//
// These run under `tsx` (see the skill's SKILL.md). They are NOT part of the
// app bundle. The only runtime contract they share with the app is the JSONL
// entry shape read by `jsonLinesParse` in .internal/src/utils/i18n.ts (which
// only reads the `id` -> `v` mapping; every other field is ignored at runtime).
//
// Shell locale files live under .internal/public/locales/<code>/shell.jsonl.
// `en` is the English source of truth; every other supported language is a
// translated target. This skill NEVER touches level/locales/**/dialogue.jsonl
// (the separate in-game dialogue system).

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
// scripts -> locales -> skills -> .claude -> repo root
export const REPO_ROOT = path.resolve(here, "..", "..", "..", "..");
export const LOCALES_DIR = path.join(REPO_ROOT, ".internal", "public", "locales");
export const NS = "shell";
// `en` is the source of truth for shell strings (there is no `main` bucket).
export const SOURCE_LOCALE = "en";

export interface SourceEntry {
  id: string;
  v: string;
  ctx?: string;
}

export interface TargetEntry {
  id: string;
  v: string;
  original: string;
  ctx?: string;
  hash: string;
  lock?: boolean;
}

/**
 * The staleness hash for a target entry: a hash of the source entry's TEXT
 * ONLY (not its context). A target is up-to-date iff its stored `hash` equals
 * `hashEntry(source.v)` for the same id. Hashing text-only mirrors the app's
 * `computeSourceHash` in .internal/src/utils/locale.ts — editing a string's
 * translator context must not mark existing translations stale.
 *
 * We deliberately use node's built-in crypto (md5) rather than the app's
 * murmurhash3js: these shell hashes are only ever compared against shell hashes
 * this same skill wrote, so the function only needs to be stable and
 * text-derived, and a dependency-free builtin lets the scripts run under plain
 * `tsx` from any cwd (the scripts live under repo-root .claude/, whose upward
 * node_modules lookup never reaches .internal/node_modules).
 */
export function hashEntry(v: string): string {
  return createHash("md5").update(v).digest("hex");
}

export function localeFile(code: string): string {
  return path.join(LOCALES_DIR, code, `${NS}.jsonl`);
}

// English language names, used as translation instructions (they read more
// naturally than the native names). Codes mirror the app's `codeToLanguage`
// (.internal/src/constants/locale.ts). `en` is the source, so the target
// locales are every key here except `en`.
export const LANG_NAMES: Record<string, string> = {
  en: "English",
  es: "Spanish",
  pt: "Portuguese",
  "pt-br": "Brazilian Portuguese",
  fr: "French",
  de: "German",
  it: "Italian",
  ru: "Russian",
  ja: "Japanese",
  ko: "Korean",
  zh: "Simplified Chinese",
  "zh-cn": "Simplified Chinese",
  "zh-tw": "Traditional Chinese",
  ar: "Arabic",
  tr: "Turkish",
  pl: "Polish",
  th: "Thai",
  vi: "Vietnamese",
  id: "Indonesian",
};

export function langName(code: string): string {
  return LANG_NAMES[code] ?? code;
}

/**
 * Target locales = every supported language except the `en` source. Derived
 * from a fixed list (not from on-disk subdirs) because the target files don't
 * exist yet — `apply.ts` creates them on demand.
 */
export function targetLocales(): string[] {
  return Object.keys(LANG_NAMES)
    .filter((code) => code !== SOURCE_LOCALE)
    .sort();
}

/** Read every entry from a JSONL file (blank lines skipped). */
export function readEntries<T = Record<string, unknown>>(file: string): T[] {
  if (!fs.existsSync(file)) return [];
  const out: T[] = [];
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    out.push(JSON.parse(trimmed) as T);
  }
  return out;
}

/**
 * A raw view of a JSONL file that keeps each line's original text (so callers
 * that rewrite the file can preserve its exact formatting/spacing). `id` is the
 * parsed entry id, or null for blank/unparseable/id-less lines; `error`
 * describes why a non-blank line has no id.
 */
export interface RawLine {
  raw: string;
  id: string | null;
  error: string | null;
}

export function readRawLines(file: string): RawLine[] {
  const out: RawLine[] = [];
  if (!fs.existsSync(file)) return out;
  const content = fs.readFileSync(file, "utf8");
  // Drop the single trailing empty element produced by a final newline so a
  // rewrite (`join("\n") + "\n"`) round-trips without growing a blank line.
  const body = content.endsWith("\n") ? content.slice(0, -1) : content;
  if (body === "") return out;
  for (const raw of body.split("\n")) {
    const trimmed = raw.trim();
    if (!trimmed) {
      out.push({ raw, id: null, error: null });
      continue;
    }
    let obj: unknown;
    try {
      obj = JSON.parse(trimmed);
    } catch (err) {
      out.push({ raw, id: null, error: `invalid JSON: ${(err as Error).message}` });
      continue;
    }
    if (typeof obj !== "object" || obj === null || typeof (obj as { id?: unknown }).id !== "string") {
      out.push({ raw, id: null, error: "missing 'id' field" });
      continue;
    }
    out.push({ raw, id: (obj as { id: string }).id, error: null });
  }
  return out;
}

/** Load the source (`en`) entries as an id -> entry map. */
export function loadSource(): Map<string, SourceEntry> {
  const map = new Map<string, SourceEntry>();
  for (const e of readEntries<SourceEntry>(localeFile(SOURCE_LOCALE))) {
    map.set(e.id, e);
  }
  return map;
}

/**
 * Stream a JSONL file line-by-line and return the first entry whose `id`
 * matches, stopping early. Used by lookup so the caller never has to slurp the
 * whole file.
 */
export async function findEntry(
  file: string,
  id: string,
): Promise<Record<string, unknown> | null> {
  if (!fs.existsSync(file)) return null;
  const rl = readline.createInterface({
    input: fs.createReadStream(file, "utf8"),
    crlfDelay: Infinity,
  });
  try {
    for await (const line of rl) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      let obj: Record<string, unknown>;
      try {
        obj = JSON.parse(trimmed);
      } catch {
        continue;
      }
      if (obj.id === id) return obj;
    }
  } finally {
    rl.close();
  }
  return null;
}

/**
 * Upsert a single entry into a JSONL file by `id`, preserving every other line
 * verbatim (so diffs stay small). Replaces in place if the id exists, else
 * appends. Creates the locale directory if it does not exist yet. Returns
 * whether the entry was added or updated.
 */
export function upsertLine(
  file: string,
  entry: { id: string },
): "added" | "updated" {
  const raw = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  const newLine = JSON.stringify(entry);
  const result: string[] = [];
  let replaced = false;
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (!replaced) {
      try {
        const obj = JSON.parse(trimmed) as { id?: string };
        if (obj.id === entry.id) {
          result.push(newLine);
          replaced = true;
          continue;
        }
      } catch {
        // fall through and keep the line as-is
      }
    }
    result.push(line);
  }
  if (!replaced) result.push(newLine);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, result.join("\n") + "\n", "utf8");
  return replaced ? "updated" : "added";
}

/** Read all of stdin as a string. */
export async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}
