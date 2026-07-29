import express from "express";
import * as fs from "fs";
import { relative, resolve, sep } from "path";

const internalDir = process.cwd();
const repoDir = resolve(internalDir, "..");
const levelDir = resolve(repoDir, "level");
const resetTemplateDir = resolve(internalDir, "reset");

export const router = express.Router({ mergeParams: true });

/**
 * A reset target describes something to remove during a full level reset.
 * - `file`: a single file, unlinked if present.
 * - `dirFiles`: the immediate files of a directory (a whitelist clear).
 *   Subdirectories are left untouched — handle them with their own targets.
 *   An optional `keep(fileName)` predicate preserves matching files; without
 *   it, every immediate file is removed.
 * - `dir`: a directory whose contents are removed recursively (a blacklist-ish
 *   full wipe). An optional `keep` predicate (given a POSIX path relative to
 *   the target dir) preserves matching files; directories left empty after
 *   pruning are removed, but a directory that still holds a kept file is not.
 */
export type ResetTarget =
  | { kind: "file"; path: string }
  | { kind: "dirFiles"; path: string; keep?: (fileName: string) => boolean }
  | { kind: "dir"; path: string; keep?: (relPath: string) => boolean };

/**
 * Files at the level root that are project scaffolding rather than authored
 * content, and so survive a reset. Everything else at the root (map/story
 * documents, the pathgraph, the pnpm lockfile, stray art PNGs, …) is cleared.
 */
const ROOT_KEEP = new Set<string>([
  ".env",
  ".npmrc",
  "AGENTS.md",
  "assets.key",
  "licenses.md",
  "tsconfig.json",
  "package.json", // restored from the template regardless
]);

/**
 * Build the set of things a full reset removes for a given level directory.
 * Adding a new asset store or a new preserved file is a one-line change here.
 */
export function buildResetTargets(dir: string): ResetTarget[] {
  return [
    // Loose files at the level root: authored documents (map/story/pathgraph),
    // the pnpm lockfile, and stray art PNGs are cleared; scaffolding in
    // ROOT_KEEP survives. Only immediate files are touched — subdirectories
    // are handled by their own targets below.
    { kind: "dirFiles", path: dir, keep: (name) => ROOT_KEEP.has(name) },

    // Editor-managed asset stores (level tilesets only — system tilesets live
    // under .internal/assets/tilesets and are untouched).
    { kind: "dir", path: resolve(dir, "tilesets") },
    { kind: "dir", path: resolve(dir, "backgrounds") },
    { kind: "dir", path: resolve(dir, "speakers") },
    { kind: "dir", path: resolve(dir, "sounds") },
    { kind: "dir", path: resolve(dir, "locales") },

    // Raw art library — keep the license and readme that ship with the pack.
    {
      kind: "dir",
      path: resolve(dir, "art"),
      keep: (rel) => rel === "LICENSE.txt" || rel === "README.md",
    },

    // pnpm environment. The dev-server bundler resolves everything from
    // .internal/node_modules, so wiping the level's install is safe for the
    // running editor; a standalone build would re-run `pnpm install`. The
    // lockfile at the root is removed by the dirFiles target above.
    { kind: "dir", path: resolve(dir, "node_modules") },
  ];
}

/** POSIX-style path of `abs` relative to `base` (for `keep` predicates). */
function relPosix(base: string, abs: string): string {
  return relative(base, abs).split(sep).join("/");
}

/**
 * Recursively delete the contents of `dir`, preserving any file for which
 * `keep(relPath)` is true. Returns true if `dir` still holds a kept entry
 * after pruning (so the caller knows whether the directory itself may be
 * removed).
 */
function clearDirWithKeep(
  root: string,
  dir: string,
  keep: (relPath: string) => boolean,
): boolean {
  let keptSomething = false;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      const kept = clearDirWithKeep(root, abs, keep);
      if (kept) {
        keptSomething = true;
      } else {
        fs.rmSync(abs, { recursive: true, force: true });
      }
    } else if (keep(relPosix(root, abs))) {
      keptSomething = true;
    } else {
      fs.unlinkSync(abs);
    }
  }
  return keptSomething;
}

/** Apply a single reset target. */
function applyTarget(target: ResetTarget): void {
  if (target.kind === "file") {
    if (fs.existsSync(target.path)) fs.unlinkSync(target.path);
    return;
  }

  if (target.kind === "dirFiles") {
    if (!fs.existsSync(target.path)) return;
    for (const entry of fs.readdirSync(target.path, { withFileTypes: true })) {
      if (entry.isFile() && !(target.keep?.(entry.name) ?? false)) {
        fs.unlinkSync(resolve(target.path, entry.name));
      }
    }
    return;
  }

  if (!fs.existsSync(target.path)) return;

  if (!target.keep) {
    fs.rmSync(target.path, { recursive: true, force: true });
    return;
  }

  clearDirWithKeep(target.path, target.path, target.keep);
}

/**
 * Perform a full level reset: delete all authored assets under `dir`, then
 * restore any bare templates from `templateDir` by copying that tree over
 * `dir`. A file dropped at `templateDir/<relpath>` is restored to
 * `dir/<relpath>`.
 */
export function performReset(dir: string, templateDir: string): void {
  for (const target of buildResetTargets(dir)) {
    applyTarget(target);
  }

  if (fs.existsSync(templateDir)) {
    fs.cpSync(templateDir, dir, { recursive: true, force: true });
  }
}

// POST "/" — wipe all authored level assets, then restore bare templates.
router.post("/", (_req, res) => {
  try {
    performReset(levelDir, resetTemplateDir);
    res.sendStatus(204);
  } catch (error) {
    console.error("Error resetting level:", error);
    res.sendStatus(500);
  }
});
