/**
 * Linear quadtree for multi-resolution zone mask painting.
 *
 * Keys have the form `${level}:${bx}:${by}` where:
 *   - `level` is a power of 2 in **pixels**: 1, 2, 4, 8, 16, 32, 64, 128, or 256
 *   - `bx` and `by` are block coordinates in units of `level` pixels
 *
 * A present key means the entire `level × level` pixel region is filled.
 * No key (or an absent key) means the region is empty at that level.
 *
 * Invariant: no two nodes in the tree may overlap. The tree is kept
 * canonical by merging sibling groups upward and splitting ancestors
 * downward whenever paint/erase operations require it.
 */

export const LEVELS = [1, 2, 4, 8, 16, 32, 64, 128, 256] as const;
export type Level = (typeof LEVELS)[number];

/** A serialisable flat map representing the quadtree. */
export type QuadTree = Record<string, boolean>;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function key(level: Level, bx: number, by: number): string {
  return `${level}:${bx}:${by}`;
}

function parseKey(k: string): { level: Level; bx: number; by: number } {
  const parts = k.split(":");
  return {
    level: Number(parts[0]) as Level,
    bx: Number(parts[1]),
    by: Number(parts[2]),
  };
}

/** Return the index of level in LEVELS, or -1. */
function levelIndex(level: Level): number {
  return LEVELS.indexOf(level);
}

/** Return the next coarser level (×2), or null if already at 256. */
function parentLevel(level: Level): Level | null {
  const idx = levelIndex(level);
  return idx < LEVELS.length - 1 ? LEVELS[idx + 1] : null;
}

/** Return the next finer level (÷2), or null if already at 1. */
function childLevel(level: Level): Level | null {
  const idx = levelIndex(level);
  return idx > 0 ? LEVELS[idx - 1] : null;
}

/**
 * Remove all descendant nodes (any level < given level) that fall inside
 * the tile region covered by (level, bx, by).
 */
function removeDescendants(
  qt: QuadTree,
  level: Level,
  bx: number,
  by: number,
): void {
  let dl = childLevel(level);
  while (dl !== null) {
    const ratio = level / dl;
    const minDbx = bx * ratio;
    const minDby = by * ratio;
    for (let dbx = minDbx; dbx < minDbx + ratio; dbx++) {
      for (let dby = minDby; dby < minDby + ratio; dby++) {
        delete qt[key(dl, dbx, dby)];
      }
    }
    dl = childLevel(dl);
  }
}

/**
 * If an ancestor of (level, bx, by) exists (a coarser node that wholly
 * contains this cell), split it recursively down until we reach the target
 * level, then remove the single child that corresponds to the target cell.
 * Returns true if an ancestor was found and split.
 */
function splitAncestor(
  qt: QuadTree,
  level: Level,
  bx: number,
  by: number,
): boolean {
  let al = parentLevel(level);
  let abx = Math.floor(bx / 2);
  let aby = Math.floor(by / 2);

  while (al !== null) {
    const akey = key(al, abx, aby);
    if (qt[akey]) {
      // Found an ancestor — split it down to `level`
      splitDown(qt, al, abx, aby, level);
      return true;
    }
    abx = Math.floor(abx / 2);
    aby = Math.floor(aby / 2);
    al = parentLevel(al);
  }
  return false;
}

/**
 * Recursively split node (fromLevel, bx, by) down to `targetLevel`,
 * replacing the node with its 4 children at each step.
 * The node itself is removed; the children are all added.
 */
function splitDown(
  qt: QuadTree,
  fromLevel: Level,
  bx: number,
  by: number,
  targetLevel: Level,
): void {
  const cl = childLevel(fromLevel);
  if (cl === null) return;

  delete qt[key(fromLevel, bx, by)];

  const cbx0 = bx * 2;
  const cby0 = by * 2;

  // Add all 4 children at childLevel
  qt[key(cl, cbx0, cby0)] = true;
  qt[key(cl, cbx0 + 1, cby0)] = true;
  qt[key(cl, cbx0, cby0 + 1)] = true;
  qt[key(cl, cbx0 + 1, cby0 + 1)] = true;

  // Recurse if we haven't reached the target yet
  if (cl !== targetLevel) {
    splitDown(qt, cl, cbx0, cby0, targetLevel);
    splitDown(qt, cl, cbx0 + 1, cby0, targetLevel);
    splitDown(qt, cl, cbx0, cby0 + 1, targetLevel);
    splitDown(qt, cl, cbx0 + 1, cby0 + 1, targetLevel);
  }
}

/**
 * After inserting (level, bx, by), try to merge all four siblings into
 * their parent, then recurse upward.
 */
function mergeUp(qt: QuadTree, level: Level, bx: number, by: number): void {
  const pl = parentLevel(level);
  if (pl === null) return;

  const pbx = Math.floor(bx / 2);
  const pby = Math.floor(by / 2);

  const c0 = key(level, pbx * 2, pby * 2);
  const c1 = key(level, pbx * 2 + 1, pby * 2);
  const c2 = key(level, pbx * 2, pby * 2 + 1);
  const c3 = key(level, pbx * 2 + 1, pby * 2 + 1);

  if (qt[c0] && qt[c1] && qt[c2] && qt[c3]) {
    delete qt[c0];
    delete qt[c1];
    delete qt[c2];
    delete qt[c3];
    qt[key(pl, pbx, pby)] = true;
    mergeUp(qt, pl, pbx, pby);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Create an empty quadtree. */
export function createQuadTree(): QuadTree {
  return {};
}

/**
 * Return true if the quadtree contains no filled cells.
 */
export function qtIsEmpty(qt: QuadTree): boolean {
  return Object.keys(qt).length === 0;
}

/**
 * Snap an arbitrary pixel size to the nearest valid quadtree level (1–256).
 */
export function qtSnapLevel(brushSize: number): Level {
  let best: Level = 1;
  let bestDist = Infinity;
  for (const l of LEVELS) {
    const d = Math.abs(brushSize - l);
    if (d < bestDist) {
      bestDist = d;
      best = l;
    }
  }
  return best;
}

/**
 * Insert a filled node at (level, bx, by), maintaining the canonical
 * invariant (no overlapping nodes, siblings merged when fully covered).
 *
 * Mutates `qt` in place and returns it for convenience.
 */
export function qtInsert(
  qt: QuadTree,
  level: Level,
  bx: number,
  by: number,
): QuadTree {
  // 1. If already covered by an ancestor, nothing to do.
  let al = parentLevel(level);
  let abx = Math.floor(bx / 2);
  let aby = Math.floor(by / 2);
  while (al !== null) {
    if (qt[key(al, abx, aby)]) return qt;
    abx = Math.floor(abx / 2);
    aby = Math.floor(aby / 2);
    al = parentLevel(al);
  }

  // 2. Remove any finer-grained nodes inside this cell.
  removeDescendants(qt, level, bx, by);

  // 3. Add the node.
  qt[key(level, bx, by)] = true;

  // 4. Try to merge upward.
  mergeUp(qt, level, bx, by);

  return qt;
}

/**
 * Remove the filled node at (level, bx, by).
 *
 * - If the exact node exists, delete it.
 * - If a coarser ancestor covers this cell, split it down and remove the
 *   target child.
 * - Remove any finer-grained descendants within this cell.
 *
 * Mutates `qt` in place and returns it for convenience.
 */
export function qtRemove(
  qt: QuadTree,
  level: Level,
  bx: number,
  by: number,
): QuadTree {
  const k = key(level, bx, by);

  if (qt[k]) {
    // Exact node exists — just delete it.
    delete qt[k];
    return qt;
  }

  // Check for an ancestor; split it down to `level`, then delete this child.
  if (splitAncestor(qt, level, bx, by)) {
    delete qt[key(level, bx, by)];
    return qt;
  }

  // Remove any finer-grained nodes inside this cell.
  removeDescendants(qt, level, bx, by);

  return qt;
}

/**
 * Returns true if the pixel at (pixelX, pixelY) is covered by any node in the
 * quadtree.
 */
export function qtContainsPixel(
  qt: QuadTree,
  pixelX: number,
  pixelY: number,
): boolean {
  for (const l of LEVELS) {
    const bx = Math.floor(pixelX / l);
    const by = Math.floor(pixelY / l);
    if (qt[key(l, bx, by)]) return true;
  }
  return false;
}

/**
 * The result of converting a quadtree to an adaptive-resolution boolean mask.
 */
export interface AdaptiveMaskResult {
  /** 2D boolean mask; index [row][col]. Empty array if the quadtree is empty. */
  mask: boolean[][];
  /**
   * Pixels per mask cell. Equals the minimum node level present in the tree,
   * so the mask represents the data at the finest painted resolution.
   */
  cellSize: number;
  /** Pixel offset (from the map's boundsX) of the mask's left edge. */
  minPX: number;
  /** Pixel offset (from the map's boundsY) of the mask's top edge. */
  minPY: number;
}

/**
 * Convert the quadtree to a boolean mask whose cell size equals the smallest
 * node level currently in the tree.
 *
 * - A 256px-only quadtree produces a coarse mask (1 cell = 256px).
 * - A 1px quadtree produces a fine mask (1 cell = 1px).
 * - Mixed levels are all represented at the finest resolution.
 *
 * The mask origin is snapped to `cellSize` boundaries and covers the tight
 * bounding box of all filled nodes. Vertex coordinates from `determineCoverage`
 * run on this mask can be converted back to world pixels via:
 *   `worldPixel = boundsXY + minPXY + vertex * cellSize`
 */
export function qtToAdaptiveMask(qt: QuadTree): AdaptiveMaskResult {
  const filledKeys = Object.keys(qt).filter((k) => qt[k]);
  if (filledKeys.length === 0) {
    return { mask: [], cellSize: 1, minPX: 0, minPY: 0 };
  }

  // Determine the finest level and the pixel bounding box.
  let cellSize = 256;
  let minPX = Infinity,
    minPY = Infinity,
    maxPX = -Infinity,
    maxPY = -Infinity;

  for (const k of filledKeys) {
    const { level, bx, by } = parseKey(k);
    if (level < cellSize) cellSize = level;
    const px0 = bx * level;
    const py0 = by * level;
    const px1 = px0 + level;
    const py1 = py0 + level;
    if (px0 < minPX) minPX = px0;
    if (py0 < minPY) minPY = py0;
    if (px1 > maxPX) maxPX = px1;
    if (py1 > maxPY) maxPY = py1;
  }

  // Align bounding box to cellSize boundaries.
  minPX = Math.floor(minPX / cellSize) * cellSize;
  minPY = Math.floor(minPY / cellSize) * cellSize;
  maxPX = Math.ceil(maxPX / cellSize) * cellSize;
  maxPY = Math.ceil(maxPY / cellSize) * cellSize;

  const maskW = (maxPX - minPX) / cellSize;
  const maskH = (maxPY - minPY) / cellSize;

  const mask: boolean[][] = Array.from({ length: maskH }, () =>
    new Array<boolean>(maskW).fill(false),
  );

  for (const k of filledKeys) {
    const { level, bx, by } = parseKey(k);
    // Cell range covered by this node, relative to mask origin.
    const cx0 = (bx * level - minPX) / cellSize;
    const cy0 = (by * level - minPY) / cellSize;
    const cx1 = Math.min((bx * level + level - minPX) / cellSize, maskW);
    const cy1 = Math.min((by * level + level - minPY) / cellSize, maskH);
    for (let cy = cy0; cy < cy1; cy++) {
      for (let cx = cx0; cx < cx1; cx++) {
        mask[cy][cx] = true;
      }
    }
  }

  return { mask, cellSize, minPX, minPY };
}

/**
 * Translate all nodes in a quadtree by `(deltaX, deltaY)` pixels.
 *
 * Because large nodes may not be aligned to an arbitrary pixel offset, this
 * works by expanding to the adaptive cell size (finest level present), shifting
 * each cell, and re-inserting into a new tree (which auto-merges upward).
 *
 * Returns a new QuadTree; the original is not mutated.
 */
export function qtShift(
  qt: QuadTree,
  deltaX: number,
  deltaY: number,
): QuadTree {
  if (deltaX === 0 && deltaY === 0) return { ...qt };
  if (qtIsEmpty(qt)) return createQuadTree();

  const { mask, cellSize, minPX, minPY } = qtToAdaptiveMask(qt);
  const newQt = createQuadTree();

  for (let cy = 0; cy < mask.length; cy++) {
    for (let cx = 0; cx < mask[cy].length; cx++) {
      if (!mask[cy][cx]) continue;
      const newPX = minPX + cx * cellSize + deltaX;
      const newPY = minPY + cy * cellSize + deltaY;
      if (newPX < 0 || newPY < 0) continue;
      const bx = Math.floor(newPX / cellSize);
      const by = Math.floor(newPY / cellSize);
      qtInsert(newQt, cellSize as Level, bx, by);
    }
  }

  return newQt;
}
