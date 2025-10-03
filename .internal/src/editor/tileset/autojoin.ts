import { converter } from "culori";

export type EdgeName = "top" | "right" | "bottom" | "left";

export interface EdgeSignatureOptions {
  /** Number of DCT coefficients to retain per edge (>=1) */
  coefficients?: number;
  /** Whether to use all OKLab channels (L,a,b) or just L (lightness). */
  useAllChannels?: boolean;
  /** Normalize signature by dividing by magnitude (L2). */
  normalize?: boolean;
}

export interface EdgeSignatures {
  top: number[];
  right: number[];
  bottom: number[];
  left: number[];
}

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

/** Build a signature index for multiple tiles. */
export function buildSignatureIndex(
  tiles: Map<string, ImageData>,
  options?: EdgeSignatureOptions
): SignatureIndex {
  const index: SignatureIndex = new Map();
  for (const [id, img] of tiles.entries()) {
    index.set(id, computeEdgeSignatures(img, options));
  }
  return index;
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
 * @param query The tile we want matches for
 * @param index Precomputed signature index
 * @param edges Which edges to consider (at least one)
 * @param options Signature generation + matching options
 */
export function matchTile(
  query: ImageData,
  index: SignatureIndex,
  edges: EdgeName[],
  options: MatchOptions = {}
): MatchResult | undefined {
  if (!edges.length) throw new Error("edges array must not be empty");
  const sigOpts: EdgeSignatureOptions = options;
  const querySig = computeEdgeSignatures(query, sigOpts);
  let best: MatchResult | undefined;
  for (const [id, sig] of index.entries()) {
    let total = 0;
    const edgeDistances: Partial<Record<EdgeName, number>> = {};
    for (const e of edges) {
      const d = l2(querySig[e], sig[e]);
      edgeDistances[e] = d;
      total += d; // aggregation 'sum'
    }
    if (!best || total < best.distance) {
      best = { id, distance: total, edgeDistances, signatures: sig };
    }
  }
  return best;
}
