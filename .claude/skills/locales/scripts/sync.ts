// Compute which target-locale entries are stale for one or more source ids and
// emit a translation worklist.
//
//   tsx sync.ts --id <id> [--id <id> ...]
//   tsx sync.ts --all
//
// An entry is stale when the target is missing, or its stored `hash` differs
// from hashEntry(source.v). Locked entries (`lock: true`) are never listed.
// Prints a JSON array of work items to stdout:
//
//   [{ locale, langName, id, source, ctx }]
//
// The agent translates each item and pipes the results to apply.ts. `en` is the
// source of truth, so it is never a target here — only the other supported
// languages are translated.

import { parseArgs } from "node:util";
import {
  hashEntry,
  langName,
  loadSource,
  localeFile,
  readEntries,
  targetLocales,
  TargetEntry,
} from "./lib.ts";

const { values } = parseArgs({
  options: {
    id: { type: "string", multiple: true },
    all: { type: "boolean" },
  },
});

const source = loadSource();
const ids = values.all ? [...source.keys()] : (values.id ?? []);

if (!values.all && ids.length === 0) {
  console.error("usage: sync.ts --id <id> [--id <id> ...] | --all");
  process.exit(2);
}

const locales = targetLocales();

// Preload each target locale's entries once (id -> entry) so --all stays linear.
const targetMaps = new Map<string, Map<string, TargetEntry>>();
for (const loc of locales) {
  const map = new Map<string, TargetEntry>();
  for (const e of readEntries<TargetEntry>(localeFile(loc))) map.set(e.id, e);
  targetMaps.set(loc, map);
}

interface WorkItem {
  locale: string;
  langName: string;
  id: string;
  source: string;
  ctx: string;
}

const worklist: WorkItem[] = [];
for (const id of ids) {
  const src = source.get(id);
  if (!src) {
    console.error(`no source entry for id="${id}" — add it to en/shell.jsonl first`);
    process.exitCode = 1;
    continue;
  }
  const hash = hashEntry(src.v);
  for (const loc of locales) {
    const current = targetMaps.get(loc)!.get(id);
    if (current?.lock) continue;
    if (current && current.hash === hash) continue; // up-to-date
    worklist.push({
      locale: loc,
      langName: langName(loc),
      id,
      source: src.v,
      ctx: src.ctx ?? "",
    });
  }
}

console.log(JSON.stringify(worklist, null, 2));
