import type { ConcavePolygon } from "@/types/polygon";
import { ShapeProximity } from "@/types/shape";
import { Vec2, Vector2 } from "@/vec";
import * as P from "pixi.js";

export function nearestDirection(
  polygon: ConcavePolygon,
  pos: Vector2,
): ShapeProximity {
  // Build vertices and indices arrays from triangles
  const vertexMap = new Map<string, number>();
  const vertices: Vector2[] = [];
  const indices: number[] = [];

  for (const triangle of polygon) {
    for (const vertex of [triangle.a, triangle.b, triangle.c]) {
      const key = `${vertex.x},${vertex.y}`;
      let index = vertexMap.get(key);
      if (index === undefined) {
        index = vertices.length;
        vertices.push(vertex);
        vertexMap.set(key, index);
      }
      indices.push(index);
    }
  }

  return _nearestDirection(vertices, indices, pos);
}

/**
 * For a point and a set of triangles, find the nearest direction from the point
 * to the "outside" of the triangles, if the point is indeed inside the
 * triangles.
 *
 * @param vertices The triangle vertices
 * @param indices The indices of the triangle vertices
 * @param pos The point to be tested
 */
export function _nearestDirection(
  vertices: Vector2[],
  indices: number[],
  pos: Vector2,
): ShapeProximity {
  // Extract boundary edges from the triangle mesh
  const edgeMap = new Map<string, number>();

  // Process all triangles to find boundary edges
  for (let i = 0; i < indices.length; i += 3) {
    const i0 = indices[i];
    const i1 = indices[i + 1];
    const i2 = indices[i + 2];

    // Add the 3 edges of this triangle (canonicalized as min,max)
    const edges = [
      [i0, i1],
      [i1, i2],
      [i2, i0],
    ];

    for (const [a, b] of edges) {
      const key = a < b ? `${a},${b}` : `${b},${a}`;
      edgeMap.set(key, (edgeMap.get(key) || 0) + 1);
    }
  }

  // Boundary edges are those that appear exactly once
  const boundaryEdges: [number, number][] = [];
  for (const [key, count] of edgeMap.entries()) {
    if (count === 1) {
      const [a, b] = key.split(",").map(Number);
      boundaryEdges.push([a, b]);
    }
  }

  // Check if point is inside any triangle
  let inside = false;
  for (let i = 0; i < indices.length; i += 3) {
    const i0 = indices[i];
    const i1 = indices[i + 1];
    const i2 = indices[i + 2];

    if (isPointInTriangle(pos, vertices[i0], vertices[i1], vertices[i2])) {
      inside = true;
      break;
    }
  }

  // Find the nearest boundary edge to the point
  let minDistSq = Infinity;
  let nearestPoint: Vector2 = pos;

  for (const [a, b] of boundaryEdges) {
    const va = vertices[a];
    const vb = vertices[b];
    const closest = closestPointOnSegment(pos, va, vb);

    const dx = closest.x - pos.x;
    const dy = closest.y - pos.y;
    const distSq = dx * dx + dy * dy;

    if (distSq < minDistSq) {
      minDistSq = distSq;
      nearestPoint = closest;
    }
  }

  // The direction from the point to the nearest boundary point
  const direction = new Vec2(nearestPoint.x - pos.x, nearestPoint.y - pos.y);

  return {
    direction,
    inside,
  };
}

/**
 * Test if a point is inside a triangle using barycentric coordinates.
 */
function isPointInTriangle(
  p: Vector2,
  a: Vector2,
  b: Vector2,
  c: Vector2,
): boolean {
  // Compute barycentric coordinates
  const v0x = c.x - a.x;
  const v0y = c.y - a.y;
  const v1x = b.x - a.x;
  const v1y = b.y - a.y;
  const v2x = p.x - a.x;
  const v2y = p.y - a.y;

  const dot00 = v0x * v0x + v0y * v0y;
  const dot01 = v0x * v1x + v0y * v1y;
  const dot02 = v0x * v2x + v0y * v2y;
  const dot11 = v1x * v1x + v1y * v1y;
  const dot12 = v1x * v2x + v1y * v2y;

  const invDenom = 1 / (dot00 * dot11 - dot01 * dot01);
  const u = (dot11 * dot02 - dot01 * dot12) * invDenom;
  const v = (dot00 * dot12 - dot01 * dot02) * invDenom;

  // Check if point is in triangle
  return u >= 0 && v >= 0 && u + v <= 1;
}

/**
 * Find the closest point on a line segment to a given point.
 */
function closestPointOnSegment(p: Vector2, a: Vector2, b: Vector2): Vector2 {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const apx = p.x - a.x;
  const apy = p.y - a.y;

  const abDotAb = abx * abx + aby * aby;
  const apDotAb = apx * abx + apy * aby;

  const t = apDotAb / abDotAb;
  const tClamped = Math.max(0, Math.min(1, t));

  return {
    x: a.x + abx * tClamped,
    y: a.y + aby * tClamped,
  };
}

/**
 * Computes the convex hull of a set of 2D points using Andrew's monotone chain
 * algorithm.
 * @param points Array of Vector2 points
 * @returns Array of indices into the original points array that form the convex
 * hull in counter-clockwise order
 */
export function convexHull(points: Vector2[]): number[] {
  if (points.length < 3) {
    return points.map((_, i) => i);
  }

  // Create array of indices sorted by x-coordinate (then y-coordinate)
  const indices = points.map((_, i) => i);
  indices.sort((i, j) => {
    const pi = points[i];
    const pj = points[j];
    return pi.x !== pj.x ? pi.x - pj.x : pi.y - pj.y;
  });

  // Cross product to determine turn direction
  const cross = (o: number, a: number, b: number): number => {
    const po = points[o];
    const pa = points[a];
    const pb = points[b];
    return (pa.x - po.x) * (pb.y - po.y) - (pa.y - po.y) * (pb.x - po.x);
  };

  // Build lower hull
  const lower: number[] = [];
  for (const i of indices) {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2], lower[lower.length - 1], i) <= 0
    ) {
      lower.pop();
    }
    lower.push(i);
  }

  // Build upper hull
  const upper: number[] = [];
  for (let j = indices.length - 1; j >= 0; j--) {
    const i = indices[j];
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2], upper[upper.length - 1], i) <= 0
    ) {
      upper.pop();
    }
    upper.push(i);
  }

  // Remove last point of each half because it's repeated
  lower.pop();
  upper.pop();

  // Concatenate lower and upper hull
  return lower.concat(upper);
}

/**
 * Draws an inward-offset outline (polygon inset) on `gfx` representing the
 * padding boundary of a zone.
 *
 * The boundary of the triangulated shape is traced as one or more ordered
 * loops. At each vertex the inward normals of the two adjacent edges are
 * averaged to produce a miter-join direction, and the vertex is shifted
 * `padding` units along that direction. The resulting offset vertices are
 * connected as a closed polyline — no gaps, no disconnected segments.
 */
export function drawPaddingOutline(
  gfx: P.Graphics,
  shapes: ConcavePolygon[],
  padding: number,
): void {
  // ── 1. Build a deduplicated vertex list and flat index array ─────────────
  const vertexMap = new Map<string, number>();
  const vertices: { x: number; y: number }[] = [];
  const indices: number[] = [];

  for (const polygon of shapes) {
    for (const triangle of polygon) {
      for (const vertex of [triangle.a, triangle.b, triangle.c]) {
        const key = `${vertex.x},${vertex.y}`;
        let idx = vertexMap.get(key);
        if (idx === undefined) {
          idx = vertices.length;
          vertices.push(vertex);
          vertexMap.set(key, idx);
        }
        indices.push(idx);
      }
    }
  }

  // ── 2. Find boundary edges (appear in exactly one triangle) ──────────────
  //    Also record each edge's inward unit normal and the opposite vertex.
  const edgeCount = new Map<string, number>();
  const edgeOpposite = new Map<string, number>();

  for (let i = 0; i < indices.length; i += 3) {
    const i0 = indices[i];
    const i1 = indices[i + 1];
    const i2 = indices[i + 2];

    for (const [a, b, opp] of [
      [i0, i1, i2],
      [i1, i2, i0],
      [i2, i0, i1],
    ] as [number, number, number][]) {
      const key = a < b ? `${a},${b}` : `${b},${a}`;
      edgeCount.set(key, (edgeCount.get(key) ?? 0) + 1);
      edgeOpposite.set(key, opp);
    }
  }

  // ── 3. Build per-vertex adjacency with inward normals ────────────────────
  interface EdgeInfo {
    other: number;
    inx: number;
    iny: number;
  }
  const adj = new Map<number, EdgeInfo[]>();

  for (const [key, count] of edgeCount) {
    if (count !== 1) continue;

    const [ai, bi] = key.split(",").map(Number);
    const a = vertices[ai];
    const b = vertices[bi];
    const opp = vertices[edgeOpposite.get(key)!];

    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.001) continue;

    const nx = -dy / len;
    const ny = dx / len;
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const dot = nx * (opp.x - mx) + ny * (opp.y - my);
    const inx = dot >= 0 ? nx : -nx;
    const iny = dot >= 0 ? ny : -ny;

    if (!adj.has(ai)) adj.set(ai, []);
    if (!adj.has(bi)) adj.set(bi, []);
    adj.get(ai)!.push({ other: bi, inx, iny });
    adj.get(bi)!.push({ other: ai, inx, iny });
  }

  // ── 4. Walk boundary loops and draw miter-offset closed polylines ─────────
  //
  // At each vertex v with adjacent edges e_prev and e_next, the miter offset
  // direction is the normalised sum of the two inward edge normals. The miter
  // distance is `padding / cos(α/2)` where cos(α/2) = |n1 + n2| / 2, clamped
  // so very sharp concave corners don't produce extreme spikes.
  const MAX_MITER = 4; // maximum multiplier on `padding`
  const visited = new Set<number>();

  for (const startIdx of adj.keys()) {
    if (visited.has(startIdx)) continue;

    // Walk the loop until we return to the start.
    const loop: number[] = [];
    let cur = startIdx;
    let prev = -1;

    do {
      loop.push(cur);
      visited.add(cur);
      const next = adj.get(cur)!.find((n) => n.other !== prev);
      if (!next) break;
      prev = cur;
      cur = next.other;
    } while (cur !== startIdx);

    if (loop.length < 3) continue;

    // Compute a miter-offset position for every loop vertex.
    const offsetPts: { x: number; y: number }[] = [];

    for (let i = 0; i < loop.length; i++) {
      const vIdx = loop[i];
      const prevIdx = loop[(i - 1 + loop.length) % loop.length];
      const nextIdx = loop[(i + 1) % loop.length];

      const n1 = adj.get(vIdx)!.find((e) => e.other === prevIdx);
      const n2 = adj.get(vIdx)!.find((e) => e.other === nextIdx);
      const v = vertices[vIdx];

      if (!n1 || !n2) {
        offsetPts.push({ x: v.x, y: v.y });
        continue;
      }

      const bx = n1.inx + n2.inx;
      const by = n1.iny + n2.iny;
      const bLen = Math.sqrt(bx * bx + by * by);

      if (bLen < 0.001) {
        // Normals cancel (cusp / U-turn): fall back to one edge normal.
        offsetPts.push({ x: v.x + n1.inx * padding, y: v.y + n1.iny * padding });
      } else {
        // cos(α/2) = bLen / 2  →  miter distance = padding / (bLen / 2)
        const miterDist = Math.min(padding / (bLen / 2), padding * MAX_MITER);
        offsetPts.push({
          x: v.x + (bx / bLen) * miterDist,
          y: v.y + (by / bLen) * miterDist,
        });
      }
    }

    // Draw the closed offset polyline.
    gfx.moveTo(offsetPts[0].x, offsetPts[0].y);
    for (let i = 1; i < offsetPts.length; i++) {
      gfx.lineTo(offsetPts[i].x, offsetPts[i].y);
    }
    gfx.lineTo(offsetPts[0].x, offsetPts[0].y);
    gfx.stroke({ color: 0xffffff, width: 1, alpha: 0.7, pixelLine: true });
  }
}
