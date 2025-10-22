/**
 * 3D Hilbert curve utilities.
 *
 * This module provides a function to map integer grid coordinates (x, y, z)
 * to a single position along a 3D Hilbert curve of order `bits` (i.e., a
 * cube of size 2^bits per axis). Implementation is dependency-free and based
 * on John Skilling's "Programming the Hilbert Curve" (AIP 2004) coordinate to
 * index (c2i) transform.
 */

import { OklabColor } from "@/types/color";

/**
 * Compute the Hilbert index for 3D integer coordinates.
 *
 * Contract
 * - Inputs: non-negative integers x, y, z. Optionally the number of bits per axis.
 * - Output: a single non-negative integer (the position on the Hilbert curve).
 * - Error modes:
 *   - Throws if any coordinate is negative or not finite/integer.
 *   - Throws if any coordinate is >= 2^bits.
 *   - Throws if the resulting index exceeds Number.MAX_SAFE_INTEGER (use smaller `bits`).
 *
 * Notes
 * - If `bits` is omitted, it is inferred as ceil(log2(max(x,y,z)+1)).
 * - Uses BigInt internally to avoid overflow; returns a Number when safe.
 * - For typical editor/grid use (<= 1024 per axis, bits <= 10), the result is always safe.
 */
export function hilbert3DIndex(
  x: number,
  y: number,
  z: number,
  bits?: number
): number {
  // Validate inputs
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
    throw new Error("hilbert3DIndex: coordinates must be finite numbers");
  }
  if (!Number.isInteger(x) || !Number.isInteger(y) || !Number.isInteger(z)) {
    throw new Error("hilbert3DIndex: coordinates must be integers");
  }
  if (x < 0 || y < 0 || z < 0) {
    throw new Error("hilbert3DIndex: coordinates must be non-negative");
  }

  // Infer bits if not provided
  const maxCoord = Math.max(x, y, z);
  const inferredBits = maxCoord <= 0 ? 1 : Math.ceil(Math.log2(maxCoord + 1));
  const B = bits ?? inferredBits;

  if (!Number.isInteger(B) || B <= 0) {
    throw new Error("hilbert3DIndex: 'bits' must be a positive integer");
  }

  // Bounds check using BigInt to avoid 32-bit pitfalls
  const limit = 1n << BigInt(B);
  const bx = BigInt(x);
  const by = BigInt(y);
  const bz = BigInt(z);
  if (
    bx < 0n ||
    by < 0n ||
    bz < 0n ||
    bx >= limit ||
    by >= limit ||
    bz >= limit
  ) {
    throw new Error(
      `hilbert3DIndex: coordinates must satisfy 0 <= coord < 2^bits (bits=${B})`
    );
  }

  // Implementation based on Skilling's c2i (coordinate to index) for nDims=3
  // Represent coordinates as BigInt and operate in-place
  const nDims = 3;
  const X: bigint[] = [bx, by, bz];

  // Z is the XOR of the (original) coordinates
  const Z = X[0] ^ X[1] ^ X[2];

  // Gray encode prefix: X[i] ^= X[i-1] for i descending
  for (let i = nDims - 1; i > 0; i--) {
    X[i] = X[i] ^ X[i - 1];
  }

  // Undo excess work (Skilling). This rotates/inverts lower bits depending on MSB parity.
  for (let q = 1n << BigInt(B - 1); q > 1n; q >>= 1n) {
    let p = 0n;
    for (let i = 0; i < nDims; i++) {
      if ((X[i] & q) !== 0n) p ^= 1n;
    }
    if (p === 0n) continue;
    const mask = q - 1n;
    for (let i = 0; i < nDims; i++) {
      X[i] = X[i] ^ mask;
    }
  }

  // Reverse the Gray-prefix encoding
  for (let i = 1; i < nDims; i++) {
    X[i] = X[i] ^ X[i - 1];
  }
  for (let i = 0; i < nDims; i++) {
    X[i] = X[i] ^ Z;
  }

  // Interleave bits (MSB-first per axis) into a single index
  let index = 0n;
  for (let bit = 0; bit < B; bit++) {
    const shift = BigInt(B - 1 - bit);
    for (let axis = 0; axis < nDims; axis++) {
      const b = (X[axis] >> shift) & 1n;
      index = (index << 1n) | b;
    }
  }

  if (index > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(
      `hilbert3DIndex: result exceeds Number.MAX_SAFE_INTEGER; reduce 'bits' (bits=${B})`
    );
  }

  return Number(index);
}

/**
 * Convenience: compute the maximum valid coordinate (exclusive) for a given `bits`.
 * E.g., for bits=10, returns 1024.
 */
export function hilbertAxisSize(bits: number): number {
  if (!Number.isInteger(bits) || bits <= 0) {
    throw new Error("hilbertAxisSize: bits must be a positive integer");
  }
  const value = 1n << BigInt(bits);
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    // For completeness; in practice editors don't need this many bits.
    throw new Error("hilbertAxisSize: result exceeds Number.MAX_SAFE_INTEGER");
  }
  return Number(value);
}

/**
 * Quantize real-valued coordinates into the [0, 2^bits-1] integer grid and compute
 * the 3D Hilbert index using `hilbert3DIndex`.
 *
 * - By default this is tuned for OKLab: L in [0, 1], a in [-0.5, 0.5], b in [-0.5, 0.5].
 * - Values are clamped to the provided ranges by default; set `clamp=false` to throw instead.
 */
export type AxisRange = { min: number; max: number };

export function hilbert3DIndexQuantized(
  x: number,
  y: number,
  z: number,
  options?: {
    bits?: number;
    ranges?: [AxisRange, AxisRange, AxisRange];
    clamp?: boolean;
    rounding?: "round" | "floor" | "ceil";
  }
): number {
  const bits = options?.bits ?? 10; // 10 bits => 0..1023 per axis, typical for palettes
  const ranges: [AxisRange, AxisRange, AxisRange] = options?.ranges ?? [
    { min: 0, max: 1 }, // L
    { min: -0.5, max: 0.5 }, // a
    { min: -0.5, max: 0.5 }, // b
  ];
  const clamp = options?.clamp ?? true;
  const rounding = options?.rounding ?? "round";

  const scale = hilbertAxisSize(bits) - 1; // 2^bits - 1

  function quantize(v: number, r: AxisRange): number {
    if (!Number.isFinite(v)) {
      throw new Error("hilbert3DIndexQuantized: coordinate must be finite");
    }
    let t = (v - r.min) / (r.max - r.min);
    if (clamp) {
      t = Math.min(1, Math.max(0, t));
    } else if (t < 0 || t > 1) {
      throw new Error(
        `hilbert3DIndexQuantized: value ${v} outside range [${r.min}, ${r.max}]`
      );
    }
    const q = t * scale;
    const qi =
      rounding === "floor"
        ? Math.floor(q)
        : rounding === "ceil"
          ? Math.ceil(q)
          : Math.round(q);
    return qi;
  }

  const qx = quantize(x, ranges[0]);
  const qy = quantize(y, ranges[1]);
  const qz = quantize(z, ranges[2]);

  return hilbert3DIndex(qx, qy, qz, bits);
}

/**
 * Convenience for OKLab colors. Accepts OKLab coordinates (L, a, b) as real numbers
 * and returns their 3D Hilbert index after quantization.
 *
 * Defaults:
 * - bits = 10 (0..1023 per axis)
 * - L in [0, 1]
 * - a in [-0.5, 0.5]
 * - b in [-0.5, 0.5]
 */
export function oklabHilbertIndex(
  color: OklabColor,
  bits = 10,
  clamp = true
): number {
  return hilbert3DIndexQuantized(color.l, color.a, color.b, {
    bits,
    clamp,
    ranges: [
      { min: 0, max: 1 },
      { min: -0.5, max: 0.5 },
      { min: -0.5, max: 0.5 },
    ],
  });
}
