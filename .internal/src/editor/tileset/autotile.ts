import { converter } from "culori";
import { Vector } from "../../vec";

export type EdgeName = "top" | "right" | "bottom" | "left";

export interface EdgeSignatureOptions {
  /** Number of DCT coefficients to retain per edge (>=1) */
  coefficients?: number;
  /** Whether to use all OKLab channels (L,a,b) or just L (lightness). */
  useAllChannels?: boolean;
  /** Normalize signature by dividing by magnitude (L2). */
  normalize?: boolean;
}

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

const DEFAULT_OPTIONS: Required<EdgeSignatureOptions> = {
  coefficients: 16,
  useAllChannels: true,
  normalize: true,
};

// Culori color space converter (l,a,b values in OKLab)
const toOKLab = converter("oklab");

/** Compute DCT-II for a 1D real signal. Returns first k coefficients (k <= n). */
function dct(signal: number[], k: number): number[] {
  const n = signal.length;
  const out: number[] = new Array(Math.min(k, n));
  const factor = Math.PI / n;
  for (let i = 0; i < out.length; i++) {
    let sum = 0;
    for (let j = 0; j < n; j++) {
      sum += signal[j] * Math.cos((j + 0.5) * i * factor);
    }
    // Orthogonal normalization (approx). For i=0 multiply by sqrt(1/n), else sqrt(2/n)
    const norm = i === 0 ? Math.sqrt(1 / n) : Math.sqrt(2 / n);
    out[i] = sum * norm;
  }
  return out;
}

/** Optional L2 normalization */
function normalize(vec: number[]): number[] {
  let sumSq = 0;
  for (const v of vec) sumSq += v * v;
  const mag = Math.sqrt(sumSq) || 1;
  return vec.map((v) => v / mag);
}

/** Extract OKLab-based 1D signal for an edge */
function edgeSignal(
  data: ImageData,
  edge: EdgeName,
  useAllChannels: boolean
): number[] {
  const { width, height } = data;
  const d = data.data;
  const signal: number[] = [];
  if (edge === "top" || edge === "bottom") {
    const y = edge === "top" ? 0 : height - 1;
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = d[idx] / 255,
        g = d[idx + 1] / 255,
        b = d[idx + 2] / 255;
      const { l: L, a, b: b2 } = toOKLab({ mode: "rgb", r, g, b });
      if (useAllChannels) {
        signal.push(L, a, b2);
      } else {
        signal.push(L);
      }
    }
  } else {
    // left/right
    const x = edge === "left" ? 0 : width - 1;
    for (let y = 0; y < height; y++) {
      const idx = (y * width + x) * 4;
      const r = d[idx] / 255,
        g = d[idx + 1] / 255,
        b = d[idx + 2] / 255;
      const { l: L, a, b: b2 } = toOKLab({ mode: "rgb", r, g, b });
      if (useAllChannels) {
        signal.push(L, a, b2);
      } else {
        signal.push(L);
      }
    }
  }
  return signal;
}

/** Compute the 4 edge signatures for a tile. */
export function computeEdgeSignatures(
  image: ImageData,
  options: EdgeSignatureOptions = {}
): EdgeSignatures {
  const {
    coefficients,
    useAllChannels,
    normalize: doNorm,
  } = { ...DEFAULT_OPTIONS, ...options };
  const edges: EdgeName[] = ["top", "right", "bottom", "left"];
  const result: Partial<EdgeSignatures> = {};
  for (const e of edges) {
    const sig = dct(edgeSignal(image, e, useAllChannels), coefficients);
    result[e] = doNorm ? normalize(sig) : sig;
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

export interface MatchOptions extends EdgeSignatureOptions {
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
 * The idea is to weaken (lower) the weight of edges when the position is
 * close to either edge along that axis. The "weakness" is symmetric: if a
 * point is near the top, both the top and bottom weights are reduced while
 * left/right remain comparatively high (and vice‑versa). Corner positions
 * therefore reduce all edges.
 *
 * We map the minimum distance to the pair of edges on an axis into a weight
 * in (0,1], where 1 represents strong / fully trusted (center of the grid)
 * and values approach 0 as we near an edge. No weight is ever exactly 0.
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

  const maxIndex = gridSize - 1;

  // Distance to nearest opposite pair edges inside THIS cell
  const dx = Math.min(cellX, maxIndex - cellX);
  const dy = Math.min(cellY, maxIndex - cellY);

  // Maximum achievable min-distance (center region). For even sizes there are
  // two central columns/rows sharing this value.
  const maxMinDist = Math.floor(maxIndex / 2);

  // Avoid ever returning 0 exactly to keep edges influential.
  const EPS = 1e-6;
  const norm = (d: number) => (d + EPS) / (maxMinDist + EPS);

  const horizWeight = norm(dy); // top & bottom share horizontal proximity
  const vertWeight = norm(dx); // left & right share vertical proximity

  return {
    top: horizWeight,
    bottom: horizWeight,
    left: vertWeight,
    right: vertWeight,
  };
}
