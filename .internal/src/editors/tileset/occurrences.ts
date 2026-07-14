import { globals as gApp } from "@/globals";
import { selectors } from "@/slices/tilesetEditor";
import { store } from "@/store/store";
import { Rect } from "@/types/rect";
import { IndexItem } from "@/types/spatial";
import { isTileGroupTemplate, TileGroupTemplate } from "@/types/tilegroup";
import { subState } from "@/utils/redux";
import { rectToBBox } from "@/utils/spatial";
import { globals as g } from "./globals";
import { generateGridAlignedCoords, hashCell } from "./loader";

/**
 * Duplicate-tile occurrence tracking.
 *
 * Tile template ids are content hashes (`genImageId`), so N byte-identical
 * tiles in a sheet collapse into ONE entity/node/spatial bbox at a single
 * canonical `pos`. That makes the other copies invisible to highlighting and
 * hit-testing. The duplicate positions aren't persisted, so we re-derive them
 * by rescanning the cached sheet image (the same per-cell hashing `sliceTileset`
 * does), and feed the result to:
 *   - `g.tileOccurrences` (id -> extra rects) for the overlay draws, and
 *   - `g.spatialIndex.setOccurrences(...)` so every tool's hit-test resolves a
 *     duplicate position back to the shared template.
 */

/** Positional key for de-duping a rect against a template's canonical `pos`. */
function rectKey(r: Rect): string {
  return `${r.x},${r.y}`;
}

/** Canonical `pos` plus every extra occurrence rect for a template. */
export function rectsForTemplate(obj: TileGroupTemplate): Rect[] {
  const extras = g.tileOccurrences?.get(obj.id);
  return extras ? [obj.pos, ...extras] : [obj.pos];
}

/** Drop all occurrence data (no active tileset, or one without a cached image). */
export function clearOccurrences(): void {
  g.tileOccurrences = new Map();
  g.spatialIndex?.setOccurrences([]);
}

/**
 * Rebuild the occurrence map + spatial-index occurrence tree for `tsId` by
 * rescanning its cached sheet image. No-ops (clearing) when the tileset is
 * missing, composite (no uniform grid), or its image isn't cached yet.
 */
export function rebuildOccurrences(tsId: string | null): void {
  clearOccurrences();
  if (!tsId) return;

  const ts = selectors.selectTileset(store.getState(), tsId);
  // Composite tilesets pack arbitrary sprites with no uniform grid to scan.
  if (!ts || ts.composite) return;

  const imageData = gApp.tilesetImageDataCache.get(tsId);
  if (!imageData || !gApp.tilesetTextureCache.has(tsId)) return;

  // Hash every grid cell and bucket positions by content id.
  const rectsById = new Map<string, Rect[]>();
  for (const coords of generateGridAlignedCoords(tsId, ts.gridSize)) {
    const cell = hashCell(imageData, coords);
    if (!cell) continue;
    const bucket = rectsById.get(cell.id);
    if (bucket) bucket.push(coords);
    else rectsById.set(cell.id, [coords]);
  }

  // For each real template, keep the sheet positions that aren't its canonical
  // `pos` (the canonical one already lives in the main spatial tree / is drawn
  // from `obj.pos`). Ids with no template are ignored on purpose.
  const occById = new Map<string, Rect[]>();
  const items: IndexItem[] = [];
  for (const id of ts.tiles.ids) {
    const tmpl = ts.tiles.entities[id];
    if (!tmpl || !isTileGroupTemplate(tmpl)) continue;
    const all = rectsById.get(id);
    if (!all || all.length < 2) continue;

    const canonicalKey = rectKey(tmpl.pos);
    const extras = all.filter((r) => rectKey(r) !== canonicalKey);
    if (extras.length === 0) continue;

    occById.set(id, extras);
    for (const r of extras) {
      items.push({ id, ...rectToBBox(r) });
    }
  }

  g.tileOccurrences = occById;
  g.spatialIndex.setOccurrences(items);
}

// Rebuild on tileset switch and on any change to the active tileset's tile set
// (slice / reslice / group add-delete / image replace all change `tiles.ids`).
// Gating on `tiles.ids` (not entities) avoids rebuilding on z-index/collision
// prop edits, which don't move or change tiles.
subState(
  [
    (state) => state.tilesetEditor.activeTilesetId,
    (state) => selectors.activeTileset(state)?.tiles.ids ?? null,
  ],
  (tsId) => rebuildOccurrences(tsId),
);
