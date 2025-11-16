import { Vector2 } from "@/vec";
import { converter } from "culori";
import Heap from "heap";

export type EdgeName = "top" | "right" | "bottom" | "left";

// Use typed arrays for faster numeric loops and better memory locality
export type EdgeSig = Float32Array;

export interface EdgeSignatures {
  top: EdgeSig;
  right: EdgeSig;
  bottom: EdgeSig;
  left: EdgeSig;
}

export interface EdgeQuery {
  sig: EdgeSig | null;
  weight: number;
}

export type MatchQuery = Partial<Record<EdgeName, EdgeQuery>>;

export type SignatureIndex = Map<string, EdgeSignatures>;

// Culori color space converter (l,a,b values in OKLab)
const toOKLab = converter("oklab");

/**
 * Extract OKLab-based 1D signals per channel for an edge.
 */
function edgeSignalsPerChannel(
  data: ImageData,
  edge: EdgeName
): { L: Float32Array; A: Float32Array; B: Float32Array } {
  const { width, height } = data;
  const d = data.data;
  const len = edge === "top" || edge === "bottom" ? width : height;
  const L = new Float32Array(len);
  const A = new Float32Array(len);
  const B = new Float32Array(len);

  if (edge === "top" || edge === "bottom") {
    const y = edge === "top" ? 0 : height - 1;
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = d[idx] / 255,
        g = d[idx + 1] / 255,
        b = d[idx + 2] / 255;
      const { l: lVal, a, b: b2 } = toOKLab({ mode: "rgb", r, g, b });
      L[x] = lVal as number;
      A[x] = a as number;
      B[x] = b2 as number;
    }
  } else {
    // left/right
    const x = edge === "left" ? 0 : width - 1;
    for (let y = 0; y < height; y++) {
      const idx = (y * width + x) * 4;
      const r = d[idx] / 255,
        g = d[idx + 1] / 255,
        b = d[idx + 2] / 255;
      const { l: lVal, a, b: b2 } = toOKLab({ mode: "rgb", r, g, b });
      L[y] = lVal as number;
      A[y] = a as number;
      B[y] = b2 as number;
    }
  }

  return { L, A, B };
}

/** Compute the 4 edge signatures for a tile. */
export function computeEdgeSignatures(image: ImageData): EdgeSignatures {
  const edges: EdgeName[] = ["top", "right", "bottom", "left"];
  const result: Partial<EdgeSignatures> = {};
  for (const e of edges) {
    // Build per-channel edge signals and concatenate raw OKLab values (no DCT, no truncation).
    const sigs = edgeSignalsPerChannel(image, e);
    const len = sigs.L.length + sigs.A.length + sigs.B.length;
    const combined = new Float32Array(len);
    let o = 0;
    combined.set(sigs.L, o);
    o += sigs.L.length;
    combined.set(sigs.A, o);
    o += sigs.A.length;
    combined.set(sigs.B, o);
    result[e] = combined as EdgeSig;
  }
  return result as EdgeSignatures;
}

export interface MatchResult {
  id: string;
  distance: number;
  /** Edge-wise distances used in aggregation */
  edgeDistances: Partial<Record<EdgeName, number>>;
  signatures: EdgeSignatures;
}

export interface MatchOptions {
  /** Aggregation: currently only 'sum' (L2 per-edge then summed) */
  aggregation?: "sum";
  /** Number of top matches to return (default 1). If <=0 returns empty array. */
  topN?: number;
}

// Helper to compute L2 distance with optional mid-vector early abandon.
// Returns {dist, finished}. If finished=false, the caller abandoned early.
function l2WithEarlyAbandon(
  a: ArrayLike<number>,
  b: ArrayLike<number>,
  len: number,
  weight: number,
  currentTotal: number,
  threshold: number
): { dist: number; finished: boolean } {
  let ssd = 0;
  // Only attempt early-abandon if we already have a full topN and thus a finite threshold
  const canAbandon = Number.isFinite(threshold);
  for (let i = 0; i < len; i++) {
    const d = a[i] - b[i];
    ssd += d * d;
    if (canAbandon) {
      // Lower bound of this edge's contribution if we stopped here
      const lowerBound = currentTotal + weight * Math.sqrt(ssd);
      if (lowerBound > threshold) {
        return { dist: Number.POSITIVE_INFINITY, finished: false };
      }
    }
  }
  return { dist: Math.sqrt(ssd), finished: true };
}

/**
 * Match a query ImageData against an index.
 * @param query Query edge signatures with weights
 * @param index Precomputed signature index
 * @param edges Which edges to consider (at least one)
 * @param options Signature generation + matching options
 */
export function matchTile(
  query: MatchQuery,
  index: SignatureIndex,
  options: MatchOptions = {}
): MatchResult[] {
  if (!Object.keys(query).length) throw new Error("query must not be empty");

  const { topN = 1 } = options;
  if (topN <= 0) return [];
  // Max-heap of size topN (largest distance at root) using 'heap' npm module
  const heap = new Heap<MatchResult>((a, b) => b.distance - a.distance);

  for (const [id, sigs] of index.entries()) {
    let total = 0;
    let exceeded = false;
    // Only track per-edge distances if we end up within topN
    const edgeDistances: Partial<Record<EdgeName, number>> = {};

    // Local snapshot of threshold to enable early-abandon
    const threshold =
      heap.size() === topN
        ? (heap.peek() as MatchResult).distance
        : Number.POSITIVE_INFINITY;

    for (const [edgeName, q] of Object.entries(query)) {
      const edge = edgeName as EdgeName;
      const { weight, sig } = q;
      if (!sig || weight === 0) {
        continue;
      }

      const targetSig = sigs[edge];
      if (!targetSig) {
        exceeded = true; // skip this tile
        break;
      }

      const len = Math.min(sig.length, targetSig.length);
      const { dist, finished } = l2WithEarlyAbandon(
        sig,
        targetSig,
        len,
        weight,
        total,
        threshold
      );
      if (!finished) {
        exceeded = true; // early abandon due to threshold
        break;
      }
      edgeDistances[edge] = dist;
      total += weight * dist;

      if (total > threshold) {
        exceeded = true;
        break;
      }
    }

    if (!exceeded) {
      const candidate: MatchResult = {
        id,
        distance: total,
        edgeDistances,
        signatures: sigs,
      };
      if (heap.size() < topN) {
        heap.push(candidate);
      } else if (candidate.distance < (heap.peek() as MatchResult).distance) {
        heap.replace(candidate);
      }
    }
  }

  // Sort the winners by ascending distance for stable output
  const winners = heap.toArray();
  // Sort first by distance, then by id for stable ordering
  winners.sort((a, b) => {
    if (a.distance === b.distance) {
      return a.id.localeCompare(b.id);
    }
    return a.distance - b.distance;
  });
  return winners;
}

/**
 * Pick direction (edge) weights based on a position within a square grid.
 * We reduce only the nearest edge on each axis independently:
 * - Vertical axis: reduce either 'top' or 'bottom'.
 * - Horizontal axis: reduce either 'left' or 'right'.
 * At the center, all weights are 1. As the position drifts toward an edge,
 * that edge is reduced with a sharper-than-linear (quadratic) falloff.
 * Reduction bottoms out at 0 and never goes negative.
 *
 * @param pos Position inside the grid (0 <= x,y < gridSize assumed).
 * @param gridSize Size of the (square) grid.
 * @returns Array of [edgeName, weight] suitable for `matchTile`.
 */
export function pickDirectionWeights(
  pos: Vector2,
  gridSize: Vector2
): Record<EdgeName, number> {
  // Guard: degenerate grid -> all equal weights of 1
  if (gridSize.x <= 1 && gridSize.y <= 1) {
    return {
      top: 1,
      bottom: 1,
      left: 1,
      right: 1,
    };
  }

  // Position within the current grid cell (ensure non‑negative modulo)
  const cellXRaw = pos.x % gridSize.x;
  const cellYRaw = pos.y % gridSize.y;
  const cellX = (cellXRaw + gridSize.x) % gridSize.x; // [0, gridSize.x)
  const cellY = (cellYRaw + gridSize.y) % gridSize.y; // [0, gridSize.y)

  // Distances to each edge within this cell (continuous model with edges at 0 and gridSize).
  const distances: Record<EdgeName, number> = {
    top: cellY,
    right: gridSize.x - cellX,
    bottom: gridSize.y - cellY,
    left: cellX,
  };

  // Compute nearest per-axis edges and apply quadratic falloff on each axis independently.
  const maxMinDist = Math.min(gridSize.x, gridSize.y) / 2;
  const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
  const gamma = 2; // quadratic

  // Vertical axis (top/bottom)
  const dTop = distances.top;
  const dBottom = distances.bottom;
  const vEdge: EdgeName = dTop <= dBottom ? "top" : "bottom";
  const vDist = Math.min(dTop, dBottom);
  const vNormalized = vDist / maxMinDist; // [0,1]
  const vWeight = clamp01(Math.pow(vNormalized, gamma));

  // Horizontal axis (left/right)
  const dLeft = distances.left;
  const dRight = distances.right;
  const hEdge: EdgeName = dLeft <= dRight ? "left" : "right";
  const hDist = Math.min(dLeft, dRight);
  const hNormalized = hDist / maxMinDist; // [0,1]
  const hWeight = clamp01(Math.pow(hNormalized, gamma));

  // Start with all 1s, then reduce the chosen edges per axis.
  const weights: Record<EdgeName, number> = {
    top: 1,
    right: 1,
    bottom: 1,
    left: 1,
  };
  weights[vEdge] = vWeight;
  weights[hEdge] = hWeight;
  return weights;
}
