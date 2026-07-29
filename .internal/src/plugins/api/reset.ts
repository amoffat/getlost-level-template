import express from "express";
import * as fs from "fs";
import { relative, resolve, sep } from "path";
import { ResetInfo } from "../../types/api/reset";

const internalDir = process.cwd();
const repoDir = resolve(internalDir, "..");
const levelDir = resolve(repoDir, "level");
const resetTemplateDir = resolve(internalDir, "reset");

export const router = express.Router({ mergeParams: true });

/**
 * A reset preserves an allowlist of paths and deletes everything else. Each
 * allow target is a directory that must survive a reset; which of its immediate
 * children survive is decided by `allow`. Deletions are *derived* — anything
 * under `level/` that is neither an allow target (nor an ancestor of one) nor
 * kept by a target's `allow` predicate is removed.
 */
interface AllowTarget {
  /** Absolute path to a directory that must exist: it is preserved if present
   *  and created if absent. Which of its immediate children survive is decided
   *  by `allow`. */
  path: string;
  /** Predicate over an immediate child's name: true keeps that child (and, for
   *  a subdirectory, its whole subtree). Omitted → no child survives, so the
   *  directory is emptied. Nested AllowTargets are always preserved regardless. */
  allow?: (childName: string) => boolean;
}

/**
 * Files at the level root that are project scaffolding rather than authored
 * content, and so survive a reset. Everything else at the root (map/story
 * documents, the pathgraph, the pnpm lockfile, stray art PNGs, …) is cleared.
 */
const ROOT_KEEP = new Set<string>([
  ".env",
  ".npmrc",
  "assets.key",
  "licenses.md",
]);

/**
 * Top-level names that a reset deletes but which do NOT count toward the
 * user-facing "assets to delete" total: `node_modules` is a dependency install,
 * and `src` is template + generated code restored from the reset template. Both
 * are absent from the allowlist (so they are deleted) but would drown out or
 * inflate the authored-asset count, so counting skips them.
 */
const COUNT_EXCLUDE = new Set<string>(["node_modules", "src"]);

/**
 * The allowlist of things that survive a full reset for a given level
 * directory. Everything else under `dir` is deleted. Preserving a new area is a
 * one-line addition here.
 */
function buildAllowTargets(dir: string): AllowTarget[] {
  return [
    // The level root: scaffolding in ROOT_KEEP survives; authored documents
    // (map/story/pathgraph), the pnpm lockfile, stray art PNGs, and any
    // unlisted subdirectory (node_modules, src, …) are cleared. The asset
    // stores and art library below are preserved as their own targets.
    { path: dir, allow: (name) => ROOT_KEEP.has(name) },

    // Editor-managed asset stores — kept as directories but emptied (no
    // `allow`, so no child survives). System tilesets live under
    // .internal/assets/tilesets and are untouched.
    { path: resolve(dir, "tilesets") },
    { path: resolve(dir, "backgrounds") },
    { path: resolve(dir, "speakers") },
    { path: resolve(dir, "sounds") },
    { path: resolve(dir, "locales") },

    // Raw art library — keep the license and readme that ship with the pack.
    {
      path: resolve(dir, "art"),
      allow: (name) => name === "LICENSE.txt" || name === "README.md",
    },
  ];
}

/** A single unit a reset removes: one file, or a whole directory subtree. */
type Deletion = { kind: "file"; path: string } | { kind: "tree"; path: string };

/** POSIX-style path of `abs` relative to `base`. */
function relPosix(base: string, abs: string): string {
  return relative(base, abs).split(sep).join("/");
}

/**
 * Whether `abs` is an allow target or an ancestor of one, and so must survive
 * so its own target can handle its contents.
 */
function isProtectedContainer(abs: string, targets: AllowTarget[]): boolean {
  return targets.some((t) => t.path === abs || t.path.startsWith(abs + sep));
}

/**
 * The single source of truth for what a reset removes: for an allow `target`,
 * every immediate child that is neither preserved by `target.allow` nor a
 * (nested) allow target is deleted — a subdirectory as one `tree` unit, a file
 * as a `file` unit. Both deletion and counting consume this generator, so they
 * can never drift apart.
 */
function* deletionsFor(
  targets: AllowTarget[],
  target: AllowTarget,
): Generator<Deletion> {
  if (!fs.existsSync(target.path)) return;
  for (const entry of fs.readdirSync(target.path, { withFileTypes: true })) {
    const abs = resolve(target.path, entry.name);
    if (isProtectedContainer(abs, targets)) continue; // handled by its own target
    if (target.allow?.(entry.name)) continue; // explicitly kept
    yield entry.isDirectory()
      ? { kind: "tree", path: abs }
      : { kind: "file", path: abs };
  }
}

/** Total number of files under `dir` (recursive). Used to size `tree` units. */
function countFilesRecursive(dir: string): number {
  if (!fs.existsSync(dir)) return 0;
  let n = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      n += countFilesRecursive(resolve(dir, entry.name));
    } else {
      n++;
    }
  }
  return n;
}

/** Whether a deletion at `abs` sits under a {@link COUNT_EXCLUDE} top-level
 *  name, and so should not count toward the user-facing asset total. */
function isCountExcluded(root: string, abs: string): boolean {
  return COUNT_EXCLUDE.has(relPosix(root, abs).split("/")[0]);
}

/**
 * Number of level asset files a reset would delete, excluding {@link
 * COUNT_EXCLUDE} areas (node_modules, src). Consumes the same {@link
 * deletionsFor} enumerator as {@link performReset}.
 */
function countResetAssets(dir: string): number {
  const targets = buildAllowTargets(dir);
  let n = 0;
  for (const target of targets) {
    for (const d of deletionsFor(targets, target)) {
      if (isCountExcluded(dir, d.path)) continue;
      n += d.kind === "file" ? 1 : countFilesRecursive(d.path);
    }
  }
  return n;
}

/**
 * Perform a full level reset: delete all authored assets under `dir`, ensure
 * every allow-target directory exists (an empty asset store is created if
 * missing, since a target declares a directory that must exist), then restore
 * any bare templates from `templateDir` by copying that tree over `dir`. A file
 * dropped at `templateDir/<relpath>` is restored to `dir/<relpath>`.
 */
function performReset(dir: string, templateDir: string): void {
  const targets = buildAllowTargets(dir);
  for (const target of targets) {
    for (const d of deletionsFor(targets, target)) {
      if (d.kind === "file") {
        if (fs.existsSync(d.path)) fs.unlinkSync(d.path);
      } else {
        fs.rmSync(d.path, { recursive: true, force: true });
      }
    }
  }

  // A target declares a directory that must exist; create any that are absent.
  for (const target of targets) {
    fs.mkdirSync(target.path, { recursive: true });
  }

  if (fs.existsSync(templateDir)) {
    fs.cpSync(templateDir, dir, { recursive: true, force: true });
  }
}

// GET "/" — describe what a reset would do (expandable metadata object).
router.get("/", (_req, res) => {
  try {
    const info: ResetInfo = { assetCount: countResetAssets(levelDir) };
    res.json(info);
  } catch (error) {
    console.error("Error computing reset info:", error);
    res.sendStatus(500);
  }
});

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
