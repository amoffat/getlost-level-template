import { Mutex } from "async-mutex";
import express from "express";
import * as fs from "fs";
import { resolve } from "path";

const internalDir = process.cwd();
const repoDir = resolve(internalDir, "..");
const levelDir = resolve(repoDir, "level");
const localeDir = resolve(levelDir, "locales");
const systemLocaleDir = resolve(internalDir, "public", "locales");

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

/** Write an array of entries back to a JSONL file, creating parent dirs as needed. */
function writeEntries(
  filePath: string,
  entries: Record<string, unknown>[],
): void {
  fs.mkdirSync(resolve(filePath, ".."), { recursive: true });
  // JSON.stringify preserves insertion order, so we build a new object with
  // keys in the desired order. Known keys come first (skipped if absent),
  // then any unrecognised keys are appended at the end.
  const keyOrder = ["id", "v", "hash", "ctx", "original"];
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
// Routes
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// System locale router — serves read-only files from public/locales
// ---------------------------------------------------------------------------

export const systemRouter = express.Router({ mergeParams: true });

systemRouter.get("/:locale/:file.jsonl", (req, res) => {
  try {
    const { locale, file } = req.params;
    const filePath = resolve(systemLocaleDir, locale, `${file}.jsonl`);

    if (!fs.existsSync(filePath)) {
      res.sendStatus(404);
      return;
    }

    res.sendFile(
      filePath,
      { headers: { "Content-Type": "application/jsonl" }, dotfiles: "allow" },
      (err) => {
        if (err) {
          console.error("Error sending system locale file:", err);
          if (!res.headersSent) res.sendStatus(500);
        }
      },
    );
  } catch (error) {
    console.error("Error handling system locale get:", error);
    res.sendStatus(500);
  }
});

// ---------------------------------------------------------------------------
// Level locale routes
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

  res.sendStatus(204);
});
