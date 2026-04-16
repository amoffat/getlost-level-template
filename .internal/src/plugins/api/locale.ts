import express from "express";
import * as fs from "fs";
import { Mutex } from "async-mutex";
import { resolve } from "path";

const internalDir = process.cwd();
const repoDir = resolve(internalDir, "..");
const levelDir = resolve(repoDir, "level");
const localeDir = resolve(levelDir, "locales");

export const router = express.Router({ mergeParams: true });

// ---------------------------------------------------------------------------
// Per-file mutexes
//
// All read-modify-write operations on the same JSONL file are serialised
// through a per-path Mutex so concurrent requests can never interleave.
// ---------------------------------------------------------------------------
const fileMutexes = new Map<string, Mutex>();

function getMutex(filePath: string): Mutex {
  let mutex = fileMutexes.get(filePath);
  if (!mutex) {
    mutex = new Mutex();
    fileMutexes.set(filePath, mutex);
  }
  return mutex;
}

// ---------------------------------------------------------------------------
// JSONL helpers
// ---------------------------------------------------------------------------

/** Read all entries from a JSONL file as an array, or [] if the file doesn't exist. */
function readEntries(filePath: string): Record<string, unknown>[] {
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, "utf8");
  return raw
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

/** Write an array of entries back to a JSONL file, creating parent dirs as needed. */
function writeEntries(filePath: string, entries: Record<string, unknown>[]): void {
  fs.mkdirSync(resolve(filePath, ".."), { recursive: true });
  // JSON.stringify preserves insertion order, so we build a new object with
  // keys in the desired order. Known keys come first (skipped if absent),
  // then any unrecognised keys are appended at the end.
  const keyOrder = ["k", "v", "ctx", "original"];
  const content = entries.map((e) => {
    const ordered: Record<string, unknown> = {};
    for (const key of keyOrder) if (key in e) ordered[key] = e[key];
    for (const key of Object.keys(e)) if (!keyOrder.includes(key)) ordered[key] = e[key];
    return JSON.stringify(ordered);
  }).join("\n") + "\n";
  fs.writeFileSync(filePath, content, "utf8");
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// Serve the entire locale file (read-only; no locking needed)
router.get("/:locale/:file.jsonl", (req, res) => {
  try {
    const { locale, file } = req.params;
    const filePath = resolve(localeDir, locale, `${file}.jsonl`);

    if (!fs.existsSync(filePath)) {
      res.sendStatus(404);
      return;
    }

    res.sendFile(
      filePath,
      { headers: { "Content-Type": "application/jsonl" } },
      (err) => {
        if (err) {
          console.error("Error sending locale file:", err);
          if (!res.headersSent) res.sendStatus(500);
        }
      }
    );
  } catch (error) {
    console.error("Error handling locale get:", error);
    res.sendStatus(500);
  }
});

// Get a single entry by key (read-only; no locking needed)
router.get("/:locale/:file/:id", (req, res) => {
  try {
    const { locale, file, id } = req.params;
    const filePath = resolve(localeDir, locale, `${file}.jsonl`);
    const entries = readEntries(filePath);
    const entry = entries.find((e) => e.k === id);
    if (!entry) {
      res.sendStatus(404);
      return;
    }
    res.json(entry);
  } catch (error) {
    console.error("Error handling locale entry get:", error);
    res.sendStatus(500);
  }
});

// Upsert a single entry — serialised per file
router.put("/:locale/:file/:id", express.json(), async (req, res) => {
  const { locale, file, id } = req.params;
  const filePath = resolve(localeDir, locale, `${file}.jsonl`);
  const entry = { ...req.body, k: id };

  await getMutex(filePath).runExclusive(() => {
    const entries = readEntries(filePath);
    const idx = entries.findIndex((e) => e.k === id);
    if (idx >= 0) {
      entries[idx] = entry;
    } else {
      entries.push(entry);
    }
    writeEntries(filePath, entries);
  }).catch((error) => {
    console.error("Error handling locale entry put:", error);
    if (!res.headersSent) res.sendStatus(500);
    return;
  });

  if (!res.headersSent) res.json(entry);
});

// Patch a single entry — serialised per file
router.patch("/:locale/:file/:id", express.json(), async (req, res) => {
  const { locale, file, id } = req.params;
  const filePath = resolve(localeDir, locale, `${file}.jsonl`);
  let result: Record<string, unknown> = { ...req.body, k: id };

  await getMutex(filePath).runExclusive(() => {
    const entries = readEntries(filePath);
    const idx = entries.findIndex((e) => e.k === id);
    if (idx >= 0) {
      result = { ...entries[idx], ...req.body, k: id };
      entries[idx] = result;
    } else {
      entries.push(result);
    }
    writeEntries(filePath, entries);
  }).catch((error) => {
    console.error("Error handling locale entry patch:", error);
    if (!res.headersSent) res.sendStatus(500);
    return;
  });

  if (!res.headersSent) res.json(result);
});

// Delete a single entry by key — serialised per file
router.delete("/:locale/:file/:id", async (req, res) => {
  const { locale, file, id } = req.params;
  const filePath = resolve(localeDir, locale, `${file}.jsonl`);

  await getMutex(filePath).runExclusive(() => {
    if (!fs.existsSync(filePath)) return;
    const entries = readEntries(filePath);
    const filtered = entries.filter((e) => e.k !== id);
    writeEntries(filePath, filtered);
  }).catch((error) => {
    console.error("Error handling locale entry delete:", error);
    if (!res.headersSent) res.sendStatus(500);
    return;
  });

  if (!res.headersSent) res.sendStatus(204);
});
