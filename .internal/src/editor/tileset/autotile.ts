import { converter } from "culori";
import { Vector } from "../../vec";

export type EdgeName = "top" | "right" | "bottom" | "left";

export type EdgeSig = number[];

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
): { L: number[]; A: number[]; B: number[] } {
  const { width, height } = data;
  const d = data.data;
  const L: number[] = [];
  const A: number[] = [];
  const B: number[] = [];

  if (edge === "top" || edge === "bottom") {
    const y = edge === "top" ? 0 : height - 1;
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = d[idx] / 255,
        g = d[idx + 1] / 255,
        b = d[idx + 2] / 255;
      const { l: lVal, a, b: b2 } = toOKLab({ mode: "rgb", r, g, b });
      L.push(lVal);
      A.push(a);
      B.push(b2);
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
      L.push(lVal);
      A.push(a);
      B.push(b2);
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
    const combined = sigs.L.concat(sigs.A, sigs.B);
    result[e] = combined;
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

/** Euclidean distance between vectors (assumed equal length) */
function l2(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    s += d * d;
  }
  return Math.sqrt(s);
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

  const results: MatchResult[] = [];

  for (const [id, sigs] of index.entries()) {
    let total = 0;
    const edgeDistances: Partial<Record<EdgeName, number>> = {};
    for (const [edgeName, q] of Object.entries(query)) {
      const edge = edgeName as EdgeName;
      const { weight, sig } = q;
      if (!sig) {
        // Query lacks this edge (null), skip it
        continue;
      }

      const targetSig = sigs[edge];
      if (!targetSig) {
        // If the target tile lacks this edge signature, penalize heavily (or skip). We choose skip.
        total = Number.POSITIVE_INFINITY;
        break;
      }
      // Assume equal length; if mismatch, compare on overlapping portion to remain robust.
      const len = Math.min(sig.length, targetSig.length);
      const dist = l2(sig.slice(0, len), targetSig.slice(0, len));
      edgeDistances[edge] = dist; // raw (unweighted) distance for transparency
      total += weight * dist;
    }
    if (total !== Number.POSITIVE_INFINITY) {
      results.push({ id, distance: total, edgeDistances, signatures: sigs });
    }
  }

  results.sort((a, b) => a.distance - b.distance);
  return results.slice(0, Math.min(topN, results.length));
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
  pos: Vector,
  gridSize: number
): Record<EdgeName, number> {
  // Guard: degenerate grid -> all equal weights of 1
  if (gridSize <= 1) {
    return {
      top: 1,
      bottom: 1,
      left: 1,
      right: 1,
    };
  }

  // Position within the current grid cell (ensure non‑negative modulo)
  const cellXRaw = pos.x % gridSize;
  const cellYRaw = pos.y % gridSize;
  const cellX = (cellXRaw + gridSize) % gridSize; // [0, gridSize)
  const cellY = (cellYRaw + gridSize) % gridSize; // [0, gridSize)

  // Distances to each edge within this cell (continuous model with edges at 0 and gridSize).
  const distances: Record<EdgeName, number> = {
    top: cellY,
    right: gridSize - cellX,
    bottom: gridSize - cellY,
    left: cellX,
  };

  // Compute nearest per-axis edges and apply quadratic falloff on each axis independently.
  const maxMinDist = gridSize / 2;
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
