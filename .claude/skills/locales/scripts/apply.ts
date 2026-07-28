// Write the agent's translations back into the target locale files.
//
//   echo '[{"locale":"fr","id":"close","value":"Fermer"}]' | tsx apply.ts
//
// Reads a JSON array of { locale, id, value } from stdin (stdin avoids
// shell-escaping issues with unicode / multi-line / RTL text). For each item it
// looks up the `en` source entry, recomputes the staleness hash, and upserts
//
//   { id, v: value, original: source.v, ctx: source.ctx, hash, lock: false }
//
// into <locale>/shell.jsonl (preserving the order of untouched lines, creating
// the locale directory if needed). Entries currently marked `lock: true` are
// skipped and reported.

import {
  findEntry,
  hashEntry,
  loadSource,
  localeFile,
  readStdin,
  TargetEntry,
  upsertLine,
} from "./lib.ts";

interface Item {
  locale: string;
  id: string;
  value: string;
}

const raw = await readStdin();
let items: Item[];
try {
  items = JSON.parse(raw);
} catch (err) {
  console.error(`apply.ts: could not parse stdin as JSON: ${(err as Error).message}`);
  process.exit(2);
}
if (!Array.isArray(items)) {
  console.error("apply.ts: stdin must be a JSON array of { locale, id, value }");
  process.exit(2);
}

const source = loadSource();
let added = 0;
let updated = 0;
let skipped = 0;

for (const item of items) {
  const { locale, id, value } = item;
  if (!locale || !id || typeof value !== "string") {
    console.error(`apply.ts: skipping malformed item: ${JSON.stringify(item)}`);
    process.exitCode = 1;
    continue;
  }
  const src = source.get(id);
  if (!src) {
    console.error(`apply.ts: no source entry for id="${id}" — skipping ${locale}`);
    process.exitCode = 1;
    continue;
  }

  const file = localeFile(locale);
  const existing = (await findEntry(file, id)) as TargetEntry | null;
  if (existing?.lock) {
    console.error(`apply.ts: ${locale}/${id} is locked — skipping`);
    skipped++;
    continue;
  }

  const entry: TargetEntry = {
    id,
    v: value,
    original: src.v,
    ctx: src.ctx ?? "",
    hash: hashEntry(src.v),
    lock: false,
  };
  const result = upsertLine(file, entry);
  if (result === "added") added++;
  else updated++;
}

console.error(`apply.ts: ${added} added, ${updated} updated, ${skipped} skipped (locked)`);
