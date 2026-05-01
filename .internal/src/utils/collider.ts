import { Vector2 } from "@/vec";
import * as poly2tri from "poly2tri";
import { ConcavePolygon, Triangle } from "./polygon";

interface SimplifyOptions {
  /** Douglas-Peucker tolerance (in pixels). Higher removes more points. Default: 0.5 */
  tolerance?: number;
  /** Always keep sharp corners (angle sharper than cornerAngleThreshold). Default: true */
  preserveCorners?: boolean;
  /** Corner angle threshold in degrees. Default: 150 (keep bends sharper than this). */
  cornerAngleThreshold?: number;
  /** Drop collinear points before simplification. Default: true */
  removeCollinear?: boolean;
}

export interface DetermineCoverageOptions {
  /** Pixel connectivity for island detection. Default: 4 */
  connectivity?: 4 | 8;
  /** Ignore islands smaller than this many pixels. Default: 1 */
  minIslandArea?: number;
  /** Boundary simplification controls */
  simplify?: SimplifyOptions;
}

type Edge = { start: Vector2; end: Vector2 };

const DEFAULT_SIMPLIFY: Required<SimplifyOptions> = {
  tolerance: 0.5,
  preserveCorners: true,
  cornerAngleThreshold: 150,
  removeCollinear: true,
};

/**
 * Extracts concave polygon boundaries from a binary mask.
 *
 * This function analyzes a 2D boolean array mask and returns
 * a list of polygons representing the boundaries of solid regions ("islands").
 * Multiple polygons may be returned if there are disconnected solid regions.
 *
 * Algorithm overview:
 * 1. Detect connected component islands using flood-fill
 * 2. Trace boundary edges for each island (outer + holes)
 * 3. Simplify boundary polygons using Douglas-Peucker while preserving corners
 * 4. Triangulate using poly2tri to create filled polygons
 *
 * @param mask - 2D boolean array where true = solid, false = empty
 * @param options - Configuration options for detection and simplification
 * @returns Array of polygons, where each polygon is an array of triangles
 *
 * @example
 * ```ts
 * const mask: boolean[][] = Array(height).fill(null).map(() => Array(width).fill(false));
 * // ... fill mask with true/false values ...
 * const polygons = determineCoverage(mask, {
 *   connectivity: 8,
 *   minIslandArea: 10,
 *   simplify: { tolerance: 1.0, preserveCorners: true }
 * });
 * ```
 */
export function determineCoverage(
  mask: boolean[][],
  options: DetermineCoverageOptions = {},
): ConcavePolygon[] {
  const {
    connectivity = 4,
    minIslandArea = 1,
    simplify: userSimplify = {},
  } = options;

  const simplifyOpts = { ...DEFAULT_SIMPLIFY, ...userSimplify };

  // Handle empty masks
  if (mask.length === 0 || mask[0].length === 0) return [];

  const height = mask.length;
  const width = mask[0].length;

  // Find all disconnected solid regions (islands) using flood-fill
  const islands = extractIslands(
    mask,
    width,
    height,
    connectivity,
    minIslandArea,
  );

  const polygons: ConcavePolygon[] = [];

  // Process each island to extract and triangulate its boundary
  for (const island of islands) {
    const boundaryLoops = buildBoundaryLoops(island, width, mask);
    if (boundaryLoops.length === 0) continue;

    // Simplify all boundary loops (outer + holes) to reduce vertex count
    const simplifiedLoops = boundaryLoops.map((loop) =>
      simplifyPolygon(loop, simplifyOpts, width, height),
    );

    // Filter out degenerate loops
    const validLoops = simplifiedLoops.filter((loop) => loop.length >= 3);
    if (validLoops.length === 0) continue;

    // Prepare loops for poly2tri (outer boundary + holes)
    const { outer, holes } = separateOuterAndHoles(validLoops);
    if (outer.length < 3) continue; // Need at least 3 points

    try {
      // Triangulate with poly2tri
      const contour = outer.map((v) => new poly2tri.Point(v.x, v.y));
      const swctx = new poly2tri.SweepContext(contour);

      // Add holes to the sweep context
      if (holes.length > 0) {
        const holeContours = holes.map((hole) =>
          hole.map((v) => new poly2tri.Point(v.x, v.y)),
        );
        swctx.addHoles(holeContours);
      }

      swctx.triangulate();
      const poly2triTriangles = swctx.getTriangles();

      // Convert poly2tri triangles to our Triangle format
      const triangles = poly2triToTriangles(poly2triTriangles);
      if (triangles.length > 0) {
        polygons.push(triangles);
      }
    } catch (error) {
      // poly2tri can throw on invalid input (duplicate points, etc.)
      console.warn("Triangulation failed for island:", error);
      continue;
    }
  }

  return polygons;
}

/**
 * Detects disconnected solid regions (islands) using flood-fill algorithm.
 *
 * @param solid - 2D boolean mask where true = solid, false = empty
 * @param width - Width of the mask
 * @param height - Height of the mask
 * @param connectivity - Neighbor connectivity: 4 (cardinal) or 8 (includes diagonals)
 * @param minIslandArea - Minimum pixel count for an island to be included
 * @returns Array of islands, where each island is a Set of [x, y] coordinate pairs
 */
function extractIslands(
  solid: boolean[][],
  width: number,
  height: number,
  connectivity: 4 | 8,
  minIslandArea: number,
): Array<Set<string>> {
  const visited: boolean[][] = Array(height)
    .fill(null)
    .map(() => Array(width).fill(false));
  const islands: Array<Set<string>> = [];

  // Define neighbor offsets based on connectivity type
  // 8-connectivity includes diagonals, 4-connectivity only cardinal directions
  const neighbors: Array<[number, number]> =
    connectivity === 8
      ? [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
          [1, 1],
          [-1, 1],
          [1, -1],
          [-1, -1],
        ]
      : [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ];

  const inBounds = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < width && y < height;

  const keyOf = (x: number, y: number) => `${x},${y}`;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (visited[y][x] || !solid[y][x]) continue;

      // Start flood-fill from this unvisited solid pixel
      const island = new Set<string>();
      const stack: Array<[number, number]> = [[x, y]];
      visited[y][x] = true;

      while (stack.length) {
        const [cx, cy] = stack.pop()!;
        island.add(keyOf(cx, cy));

        for (const [dx, dy] of neighbors) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (!inBounds(nx, ny)) continue;
          if (visited[ny][nx] || !solid[ny][nx]) continue;
          visited[ny][nx] = true;
          stack.push([nx, ny]);
        }
      }

      if (island.size >= minIslandArea) islands.push(island);
    }
  }

  return islands;
}

/**
 * Traces the boundary edges of an island and stitches them into closed loops.
 *
 * Uses a marching squares-style approach: for each solid pixel, check its 4 neighbors.
 * If a neighbor is empty, add the edge between them to the boundary.
 *
 * @param island - Set of coordinate strings "x,y" representing the island pixels
 * @param width - Width of the mask
 * @param solid - 2D boolean mask for bounds checking
 * @returns Array of closed vertex loops representing the island boundary (may include holes)
 */
function buildBoundaryLoops(
  island: Set<string>,
  width: number,
  solid: boolean[][],
): Vector2[][] {
  const height = solid.length;
  const edges: Edge[] = [];

  const keyOf = (x: number, y: number) => `${x},${y}`;

  const isSolid = (x: number, y: number): boolean => {
    if (x < 0 || y < 0 || x >= width || y >= height) return false;
    return island.has(keyOf(x, y));
  };

  const edgeMap = new Map<string, Edge>();
  const addEdge = (start: Vector2, end: Vector2) => {
    const key = `${start.x},${start.y}|${end.x},${end.y}`;
    if (!edgeMap.has(key)) {
      edgeMap.set(key, { start, end });
      edges.push({ start, end });
    }
  };

  // For each solid pixel, check its 4 neighbors and add boundary edges
  // Edges are defined at pixel corners, forming a pixel-perfect boundary
  for (const coordStr of island) {
    const [x, y] = coordStr.split(",").map(Number);

    // Top edge (if neighbor above is empty)
    if (!isSolid(x, y - 1)) addEdge({ x, y }, { x: x + 1, y });
    // Right edge (if neighbor to right is empty)
    if (!isSolid(x + 1, y)) addEdge({ x: x + 1, y }, { x: x + 1, y: y + 1 });
    // Bottom edge (if neighbor below is empty)
    if (!isSolid(x, y + 1)) addEdge({ x: x + 1, y: y + 1 }, { x, y: y + 1 });
    // Left edge (if neighbor to left is empty)
    if (!isSolid(x - 1, y)) addEdge({ x, y: y + 1 }, { x, y });
  }

  return stitchEdgesIntoLoops(edges);
}

/**
 * Connects boundary edges into closed loops by following adjacency.
 *
 * @param edges - Array of directed edges forming the boundary
 * @returns Array of closed vertex loops, each representing a boundary loop
 */
function stitchEdgesIntoLoops(edges: Edge[]): Vector2[][] {
  if (edges.length === 0) return [];

  // Build adjacency map: for each point, list all connected points
  const adjacency = new Map<string, Vector2[]>();
  const keyOf = (p: Vector2) => `${p.x},${p.y}`;
  const remaining = new Map<string, Edge>();

  for (const edge of edges) {
    const startKey = keyOf(edge.start);
    const arr = adjacency.get(startKey) ?? [];
    arr.push(edge.end);
    adjacency.set(startKey, arr);
    remaining.set(`${startKey}|${keyOf(edge.end)}`, edge);
  }

  const loops: Vector2[][] = [];

  // Trace each loop by following edges until we return to start
  while (remaining.size > 0) {
    const firstKey = remaining.keys().next().value as string;
    const edge = remaining.get(firstKey)!;
    remaining.delete(firstKey);

    const loop: Vector2[] = [edge.start, edge.end];
    let current = edge.end;
    const startKey = keyOf(edge.start);

    while (true) {
      // Find any unused edge leaving current
      const nextKey = Array.from(remaining.keys()).find((k) =>
        k.startsWith(`${current.x},${current.y}|`),
      );
      if (!nextKey) break; // dead end

      const nextEdge = remaining.get(nextKey)!;
      remaining.delete(nextKey);

      // Check if this edge closes the loop (returns to start)
      if (keyOf(nextEdge.end) === startKey) {
        // Loop is properly closed, don't add start point again
        loops.push(normalizeLoop(loop));
        break;
      }

      loop.push(nextEdge.end);
      current = nextEdge.end;
    }
  }

  return loops;
}

/**
 * Removes collinear points from a closed loop to minimize vertex count.
 *
 * @param loop - Input polygon loop
 * @returns Normalized loop with collinear points removed
 */
function normalizeLoop(loop: Vector2[]): Vector2[] {
  if (loop.length === 0) return loop;
  const result: Vector2[] = [];
  for (let i = 0; i < loop.length; i++) {
    const prev = loop[(i + loop.length - 1) % loop.length];
    const curr = loop[i];
    const next = loop[(i + 1) % loop.length];
    if (!isCollinear(prev, curr, next)) {
      result.push({ ...curr });
    }
  }
  return result;
}

/**
 * Separates polygon loops into outer boundary and holes.
 *
 * The largest loop (by area) is treated as the outer boundary,
 * and remaining loops are treated as holes. Ensures correct winding
 * order: outer is CCW, holes are CW.
 *
 * @param loops - Array of vertex loops
 * @returns Object with outer boundary and array of holes
 */
function separateOuterAndHoles(loops: Vector2[][]): {
  outer: Vector2[];
  holes: Vector2[][];
} {
  if (loops.length === 0) return { outer: [], holes: [] };

  // Sort loops by area (largest first) to identify outer boundary
  const sorted = [...loops].sort(
    (a, b) => Math.abs(signedArea(b)) - Math.abs(signedArea(a)),
  );
  const outer = sorted[0];
  const holesList = sorted.slice(1);

  // poly2tri expects CCW for outer, CW for holes
  const orientedOuter = ensureOrientation(outer, true); // CCW
  const orientedHoles = holesList.map((h) => ensureOrientation(h, false)); // CW

  return { outer: orientedOuter, holes: orientedHoles };
}

/**
 * Ensures a polygon loop has the specified winding order.
 *
 * @param loop - Input vertex loop
 * @param makeCCW - If true, ensure counter-clockwise; if false, ensure clockwise
 * @returns Vertex loop with correct winding order (may be reversed)
 */
function ensureOrientation(loop: Vector2[], makeCCW: boolean): Vector2[] {
  const area = signedArea(loop);
  const isCCW = area > 0;
  if (makeCCW === isCCW) return loop;
  return [...loop].reverse();
}

/**
 * Converts poly2tri triangles to our Triangle format.
 *
 * @param poly2triTriangles - Array of triangles from poly2tri
 * @returns Array of Triangle objects
 */
function poly2triToTriangles(
  poly2triTriangles: poly2tri.Triangle[],
): Triangle[] {
  const triangles: Triangle[] = [];

  for (const t of poly2triTriangles) {
    const p0 = t.getPoint(0);
    const p1 = t.getPoint(1);
    const p2 = t.getPoint(2);

    triangles.push({
      a: { x: p0.x, y: p0.y },
      b: { x: p1.x, y: p1.y },
      c: { x: p2.x, y: p2.y },
    });
  }

  return triangles;
}

/**
 * Calculates signed area of a polygon using the shoelace formula.
 * Positive area indicates counter-clockwise winding, negative indicates clockwise.
 *
 * @param loop - Polygon vertices
 * @returns Signed area (positive for CCW, negative for CW)
 */
function signedArea(loop: Vector2[]): number {
  let area = 0;
  for (let i = 0; i < loop.length; i++) {
    const a = loop[i];
    const b = loop[(i + 1) % loop.length];
    area += a.x * b.y - b.x * a.y;
  }
  return area / 2;
}

/**
 * Simplifies a vertex loop by removing redundant vertices while preserving shape.
 *
 * Applies multiple simplification strategies:
 * 1. Remove duplicate consecutive points
 * 2. Remove collinear points (optional)
 * 3. Douglas-Peucker simplification with corner preservation (optional)
 *
 * @param loop - Input vertex loop to simplify
 * @param opts - Simplification options
 * @param maskWidth - Width of the mask (for boundary detection)
 * @param maskHeight - Height of the mask (for boundary detection)
 * @returns Simplified vertex loop
 */
function simplifyPolygon(
  loop: Vector2[],
  opts: Required<SimplifyOptions>,
  maskWidth: number,
  maskHeight: number,
): Vector2[] {
  if (loop.length <= 3) return loop;

  let pts = dedupeSequential(loop);
  if (opts.removeCollinear) pts = dropCollinear(pts, maskWidth, maskHeight);
  if (!opts.tolerance && !opts.preserveCorners) return pts;

  const keep = opts.preserveCorners
    ? detectCornerIndices(pts, opts.cornerAngleThreshold)
    : new Set<number>();

  // Also preserve boundary vertices during Douglas-Peucker simplification
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    if (p.x === 0 || p.y === 0 || p.x === maskWidth || p.y === maskHeight) {
      keep.add(i);
    }
  }

  const simplified = douglasPeucker(pts, opts.tolerance, keep);
  return dedupeSequential(simplified);
}

/**
 * Removes consecutive duplicate points from a vertex loop.
 * Also removes the last point if it duplicates the first (for closed loops).
 *
 * @param points - Input vertex loop
 * @returns Vertex loop with consecutive duplicates removed
 */
function dedupeSequential(points: Vector2[]): Vector2[] {
  const result: Vector2[] = [];
  for (const p of points) {
    const last = result[result.length - 1];
    if (!last || last.x !== p.x || last.y !== p.y) {
      result.push({ ...p });
    }
  }
  if (result.length > 1) {
    const first = result[0];
    const last = result[result.length - 1];
    if (first.x === last.x && first.y === last.y) result.pop();
  }
  return result;
}

/**
 * Removes collinear points from a vertex loop.
 * A point is collinear if it lies on the line between its neighbors.
 * Preserves points at the mask boundary (edges of the image).
 *
 * @param points - Input vertex loop
 * @param maskWidth - Width of the mask
 * @param maskHeight - Height of the mask
 * @returns Vertex loop with collinear points removed (except boundary points)
 */
function dropCollinear(
  points: Vector2[],
  maskWidth: number,
  maskHeight: number,
): Vector2[] {
  if (points.length <= 3) return points;

  const isBoundaryPoint = (p: Vector2) => {
    return p.x === 0 || p.y === 0 || p.x === maskWidth || p.y === maskHeight;
  };

  const result: Vector2[] = [];
  for (let i = 0; i < points.length; i++) {
    const prev = points[(i + points.length - 1) % points.length];
    const curr = points[i];
    const next = points[(i + 1) % points.length];
    if (!isCollinear(prev, curr, next) || isBoundaryPoint(curr)) {
      result.push({ ...curr });
    }
  }
  return result;
}

/**
 * Tests if three points are collinear (lie on the same line).
 * Uses cross product; points are collinear if cross product is ~0.
 *
 * @param a - First point
 * @param b - Middle point
 * @param c - Third point
 * @returns True if points are collinear within epsilon tolerance
 */
function isCollinear(a: Vector2, b: Vector2, c: Vector2): boolean {
  const cross = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  return Math.abs(cross) < 1e-6;
}

/**
 * Identifies corner vertices in a vertex loop based on angle threshold.
 * Corners are vertices where the angle between incoming/outgoing edges
 * is sharper than the threshold.
 *
 * @param points - Input vertex loop
 * @param thresholdDeg - Angle threshold in degrees (smaller = sharper corner)
 * @returns Set of indices representing corner vertices
 */
function detectCornerIndices(
  points: Vector2[],
  thresholdDeg: number,
): Set<number> {
  const keep = new Set<number>();
  const thresholdRad = (thresholdDeg * Math.PI) / 180;
  for (let i = 0; i < points.length; i++) {
    const prev = points[(i + points.length - 1) % points.length];
    const curr = points[i];
    const next = points[(i + 1) % points.length];

    const v1 = { x: prev.x - curr.x, y: prev.y - curr.y };
    const v2 = { x: next.x - curr.x, y: next.y - curr.y };
    const len1 = Math.hypot(v1.x, v1.y);
    const len2 = Math.hypot(v2.x, v2.y);
    if (len1 === 0 || len2 === 0) continue;
    const dot = (v1.x * v2.x + v1.y * v2.y) / (len1 * len2);
    const angle = Math.acos(Math.min(1, Math.max(-1, dot)));
    if (angle < thresholdRad) keep.add(i);
  }
  return keep;
}

/**
 * Simplifies a vertex loop using the Douglas-Peucker algorithm.
 *
 * Recursively removes points that are within a tolerance distance from
 * the line between their neighbors. Points in the 'keep' set are never removed.
 *
 * @param points - Input vertex loop
 * @param tolerance - Maximum perpendicular distance for point removal (in pixels)
 * @param keep - Set of indices that must be preserved (e.g., corners)
 * @returns Simplified vertex loop
 */
function douglasPeucker(
  points: Vector2[],
  tolerance: number,
  keep: Set<number>,
): Vector2[] {
  if (points.length <= 2) return points;
  const tolSq = tolerance * tolerance;

  const result: number[] = [0, points.length - 1];
  const stack: Array<[number, number]> = [[0, points.length - 1]];

  // Calculate squared perpendicular distance from point to line segment
  const pointDistSq = (p: Vector2, a: Vector2, b: Vector2) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    if (dx === 0 && dy === 0) return (p.x - a.x) ** 2 + (p.y - a.y) ** 2;
    const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy);
    const clampedT = Math.max(0, Math.min(1, t));
    const projX = a.x + clampedT * dx;
    const projY = a.y + clampedT * dy;
    return (p.x - projX) ** 2 + (p.y - projY) ** 2;
  };

  // Iterative Douglas-Peucker: find furthest point from each segment
  while (stack.length) {
    const [start, end] = stack.pop()!;
    let maxDistSq = -1;
    let index = -1;
    for (let i = start + 1; i < end; i++) {
      // Points in 'keep' set get infinite distance (always kept)
      const distSq = keep.has(i)
        ? Number.POSITIVE_INFINITY
        : pointDistSq(points[i], points[start], points[end]);
      if (distSq > maxDistSq) {
        maxDistSq = distSq;
        index = i;
      }
    }

    if (maxDistSq > tolSq && index !== -1) {
      result.push(index);
      stack.push([start, index], [index, end]);
    }
  }

  const unique = Array.from(new Set(result)).sort((a, b) => a - b);
  return unique.map((i) => ({ ...points[i] }));
}

/**
 * Decodes a Uint8Array back into a 2D boolean array.
 */
export function decodeMask(buffer: Uint8Array): boolean[][] {
  if (!buffer || buffer.length < 8) return [];

  // Use DataView to read width and height as 32-bit integers
  const view = new DataView(
    buffer.buffer,
    buffer.byteOffset,
    buffer.byteLength,
  );
  const width = view.getUint32(0, true); // little-endian
  const height = view.getUint32(4, true); // little-endian

  // Unpack bits into 2D array
  const mask: boolean[][] = Array(height)
    .fill(null)
    .map(() => Array(width).fill(false));

  let bitIndex = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const byteIndex = 8 + Math.floor(bitIndex / 8);
      const bitOffset = bitIndex % 8;
      mask[y][x] = (buffer[byteIndex] & (1 << bitOffset)) !== 0;
      bitIndex++;
    }
  }

  return mask;
}

/**
 * Encodes a 2D boolean array into a compact binary Uint8Array.
 * Format: width (4 bytes) + height (4 bytes) + bitmask data
 * Each byte in the bitmask represents 8 pixels (bits).
 */
export function encodeMask(mask: boolean[][]): Uint8Array {
  if (mask.length === 0) return new Uint8Array(0);

  const height = mask.length;
  const width = mask[0].length;
  const totalBits = width * height;
  const numBytes = Math.ceil(totalBits / 8);

  // Create a buffer: 4 bytes for width + 4 bytes for height + bitmask bytes
  const buffer = new Uint8Array(8 + numBytes);

  // Use DataView to write width and height as 32-bit integers
  const view = new DataView(
    buffer.buffer,
    buffer.byteOffset,
    buffer.byteLength,
  );
  view.setUint32(0, width, true); // little-endian
  view.setUint32(4, height, true); // little-endian

  // Pack bits into bytes
  let bitIndex = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (mask[y][x]) {
        const byteIndex = 8 + Math.floor(bitIndex / 8);
        const bitOffset = bitIndex % 8;
        buffer[byteIndex] |= 1 << bitOffset;
      }
      bitIndex++;
    }
  }

  return buffer;
}

/** Point-in-triangle test using the sign method. */
export function pointInTriangle(
  px: number,
  py: number,
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number },
): boolean {
  const d1 = (px - b.x) * (a.y - b.y) - (a.x - b.x) * (py - b.y);
  const d2 = (px - c.x) * (b.y - c.y) - (b.x - c.x) * (py - c.y);
  const d3 = (px - a.x) * (c.y - a.y) - (c.x - a.x) * (py - a.y);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}
