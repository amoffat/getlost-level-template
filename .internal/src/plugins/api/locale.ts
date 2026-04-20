import { supportedLangs } from "@/constants/locale";
import { Mutex } from "async-mutex";
import express from "express";
import * as fs from "fs";
import { resolve } from "path";

const internalDir = process.cwd();
const repoDir = resolve(internalDir, "..");
const levelDir = resolve(repoDir, "level");
const localeDir = resolve(levelDir, "locales");

const mainLocale = "main";
const nonMainLocales = supportedLangs.filter((l) => l !== mainLocale);

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
function writeEntries(
  filePath: string,
  entries: Record<string, unknown>[],
): void {
  fs.mkdirSync(resolve(filePath, ".."), { recursive: true });
  // JSON.stringify preserves insertion order, so we build a new object with
  // keys in the desired order. Known keys come first (skipped if absent),
  // then any unrecognised keys are appended at the end.
  const keyOrder = ["k", "v", "ctx", "original"];
  const content =
    entries
      .map((e) => {
        const ordered: Record<string, unknown> = {};
        for (const key of keyOrder) if (key in e) ordered[key] = e[key];
        for (const key of Object.keys(e))
          if (!keyOrder.includes(key)) ordered[key] = e[key];
        return JSON.stringify(ordered);
      })
      .join("\n") + "\n";
  fs.writeFileSync(filePath, content, "utf8");
}

// ---------------------------------------------------------------------------
// Locale propagation
// ---------------------------------------------------------------------------

/**
 * Merges main-locale entries into a single non-main locale file.
 * - Missing entries are seeded with v, original, and ctx from main.
 * - Existing entries have their ctx overwritten (or removed) from main.
 * - Entries absent from main are dropped (stale removal).
 */
async function upsertLocaleFile(
  locale: string,
  file: string,
  mainMap: Map<string, Record<string, unknown>>,
): Promise<void> {
  const filePath = resolve(localeDir, locale, `${file}.jsonl`);
  await getMutex(filePath).runExclusive(() => {
    const existing = readEntries(filePath);
    const existingMap = new Map(existing.map((e) => [e.k as string, e]));

    const merged: Record<string, unknown>[] = [];
    for (const [k, mainEntry] of mainMap) {
      const current = existingMap.get(k);
      if (current) {
        const updated = { ...current };
        if ("ctx" in mainEntry) {
          updated.ctx = mainEntry.ctx;
        } else {
          delete updated.ctx;
        }
        merged.push(updated);
      } else {
        const seeded: Record<string, unknown> = {
          k,
          v: mainEntry.v,
          original: mainEntry.v,
        };
        if ("ctx" in mainEntry) seeded.ctx = mainEntry.ctx;
        merged.push(seeded);
      }
    }
    writeEntries(filePath, merged);
  });
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
      },
    );
  } catch (error) {
    console.error("Error handling locale get:", error);
    res.sendStatus(500);
  }
});

// Write the entire locale file atomically — serialised per file.
// When writing the main locale, propagate entries to all non-main locale files.
router.put("/:locale/:file.jsonl", express.json(), async (req, res) => {
  const { locale, file } = req.params;
  const filePath = resolve(localeDir, locale, `${file}.jsonl`);
  const entries = req.body as Record<string, unknown>[];

  if (!Array.isArray(entries)) {
    res.sendStatus(400);
    return;
  }

  await getMutex(filePath)
    .runExclusive(() => {
      writeEntries(filePath, entries);
    })
    .catch((error) => {
      console.error("Error handling locale file write:", error);
      if (!res.headersSent) res.sendStatus(500);
      return;
    });

  if (res.headersSent) return;

  if (locale === mainLocale) {
    const mainMap = new Map(entries.map((e) => [e.k as string, e]));
    for (const nonMain of nonMainLocales) {
      await upsertLocaleFile(nonMain, file, mainMap).catch((error) => {
        console.error(
          `Error propagating locale to ${nonMain}/${file}.jsonl:`,
          error,
        );
      });
    }
  }

  res.sendStatus(204);
});
