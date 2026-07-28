// Find and remove unused shell i18n keys from the locale files.
//
//   tsx prune.ts                 # dry-run report (default)
//   tsx prune.ts --write         # remove unused keys from every locale file
//   tsx prune.ts --json          # machine-readable report
//
// A key is "unused" when its `id` (from the `en` source shell.jsonl) is not
// referenced anywhere in the repo's .ts/.tsx code (e.g. `t("someKey")`). A
// single ripgrep invocation searches for every key at once, using Aho-Corasick
// matching under the hood. Matches inside a `locales/` directory are discarded
// as false positives (that's the locale data itself, not a code reference).
//
// With --write, each unused id is removed from EVERY locale file (the `en`
// source and all translated targets), so pruning a dead source key never leaves
// orphaned translations behind. This is a port of the previous
// prune-shell-locales Python skill; it reads the `id` field (post `k`->`id`
// migration) and never touches level/locales/**/dialogue.jsonl.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";
import {
  localeFile,
  readRawLines,
  REPO_ROOT,
  SOURCE_LOCALE,
  targetLocales,
} from "./lib.ts";

const SEARCH_EXTENSIONS = [".ts", ".tsx"];
// Any match under a path containing one of these is a false positive: it's the
// locale data itself (or a mirrored translation), not a code reference.
const LOCALE_DIR_MARKERS = ["locales/"];

const { values } = parseArgs({
  options: {
    write: { type: "boolean" },
    json: { type: "boolean" },
  },
});

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** A match counts only if it's in real code, not the locale data. */
function isRealMatch(p: string): boolean {
  if (!SEARCH_EXTENSIONS.some((ext) => p.endsWith(ext))) return false;
  const normalized = p.split(path.sep).join("/");
  return !LOCALE_DIR_MARKERS.some((marker) => normalized.includes(marker));
}

/**
 * One ripgrep invocation across the whole tree for every key at once. Patterns
 * are wrapped in \b word-boundary anchors (not plain fixed strings): many keys
 * are literal prefixes of other keys (e.g. "upgradeFailed" / "upgradeFailedMsg"),
 * and with alternation ripgrep's --only-matching reports whichever alternative
 * matches first, silently misattributing the match to the shorter key. Word
 * boundaries make each pattern match only its exact identifier.
 */
function findUsedKeys(keys: string[], searchRoot: string): Set<string> {
  const rgPath = spawnSync(process.platform === "win32" ? "where" : "which", ["rg"]);
  if (rgPath.status !== 0) {
    console.error("error: ripgrep ('rg') is required but was not found on PATH");
    process.exit(1);
  }

  const patternsFile = path.join(
    os.tmpdir(),
    `prune_shell_locales_patterns_${process.pid}`,
  );
  fs.writeFileSync(
    patternsFile,
    keys.map((k) => `\\b${escapeRegex(k)}\\b`).join("\n") + "\n",
    "utf8",
  );

  let result;
  try {
    result = spawnSync(
      "rg",
      [
        "--only-matching",
        "--no-heading",
        "--line-number",
        "--no-messages",
        "--hidden",
        "-f",
        patternsFile,
        searchRoot,
      ],
      { encoding: "utf8", maxBuffer: 1024 * 1024 * 256 },
    );
  } finally {
    fs.unlinkSync(patternsFile);
  }

  // rg exits 1 when there are no matches at all — still fine.
  if (result.status !== 0 && result.status !== 1) {
    console.error(`error: ripgrep failed: ${result.stderr}`);
    process.exit(1);
  }

  const keySet = new Set(keys);
  const used = new Set<string>();
  for (const line of (result.stdout ?? "").split("\n")) {
    if (!line) continue;
    // Format: path:line_number:matched_text
    const parts = line.split(":");
    if (parts.length < 3) continue;
    const p = parts[0];
    const matched = parts.slice(2).join(":");
    if (keySet.has(matched) && isRealMatch(p)) used.add(matched);
  }
  return used;
}

// ---------------------------------------------------------------------------

const sourceFile = localeFile(SOURCE_LOCALE);
if (!fs.existsSync(sourceFile)) {
  console.error(`error: source locale file not found: ${sourceFile}`);
  process.exit(1);
}

const sourceLines = readRawLines(sourceFile);
const parseErrors = sourceLines.filter((l) => l.error !== null);
if (parseErrors.length > 0) {
  console.error(`error: ${parseErrors.length} line(s) in ${sourceFile} failed to parse:`);
  for (const l of parseErrors) console.error(`  ${l.error}: ${l.raw.trim()}`);
  process.exit(1);
}

const keys = sourceLines.map((l) => l.id).filter((id): id is string => id !== null);
const usedKeys = findUsedKeys(keys, REPO_ROOT);

const unused: string[] = [];
const ambiguous: string[] = [];
let usedCount = 0;
for (const key of keys) {
  if (usedKeys.has(key)) {
    usedCount++;
    continue;
  }
  unused.push(key);
  if (key.includes(".")) ambiguous.push(key); // possibly built dynamically
}

if (values.json) {
  console.log(
    JSON.stringify({ total: keys.length, used: usedCount, unused, ambiguous }, null, 2),
  );
} else {
  console.log(`Scanned ${keys.length} keys in ${sourceFile}`);
  console.log(`  Used:          ${usedCount}`);
  console.log(`  Unused:        ${unused.length}`);
  console.log(`  Ambiguous (flagged, still counted unused): ${ambiguous.length}`);
  console.log();
  if (unused.length) {
    console.log("Unused keys (would be removed with --write):");
    for (const k of unused) console.log(`  - ${k}`);
    console.log();
  }
  if (ambiguous.length) {
    console.log("Ambiguous keys (contain '.' — possible dynamic construction, verify manually):");
    for (const k of ambiguous) console.log(`  - ${k}`);
    console.log();
  }
}

// Keep stdout pure JSON in --json mode: skip the narrative lines below.
const say = (msg: string) => {
  if (!values.json) console.log(msg);
};

if (!values.write) {
  if (unused.length) {
    say("Dry run only. Re-run with --write to remove these lines from every locale file.");
  } else {
    say("Nothing to prune.");
  }
  process.exit(0);
}

if (!unused.length) {
  say("Nothing to remove; not rewriting files.");
  process.exit(0);
}

// --write: remove each unused id from the source AND every target locale file,
// preserving each file's untouched lines/formatting verbatim.
const unusedSet = new Set(unused);
for (const locale of [SOURCE_LOCALE, ...targetLocales()]) {
  const file = localeFile(locale);
  if (!fs.existsSync(file)) continue;
  const lines = readRawLines(file);
  const kept = lines.filter((l) => l.id === null || !unusedSet.has(l.id));
  const removed = lines.length - kept.length;
  if (removed === 0) continue;
  fs.writeFileSync(file, kept.map((l) => l.raw).join("\n") + "\n", "utf8");
  say(`  ${locale}/${path.basename(file)}: removed ${removed} (${lines.length} -> ${kept.length} lines)`);
}

say(`Removed ${unused.length} unused key(s) across locales.`);
