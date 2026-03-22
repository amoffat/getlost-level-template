import { Vec2 } from "./vec2";

export interface TrackResult {
  index: number;
  distance: number;
  t: number;
}

/**
 * Derives the index of the next waypoint to target along a path for the given
 * position. Uses the closest point on the polyline (segment projection) to
 * determine progress so the index advances monotonically instead of flipping
 * between adjacent waypoints.
 *
 * @param pos - The current position as a Vec2 object.
 * @param path - An array of Vec2 waypoints representing the path.
 * @returns The index of the waypoint to target next.
 */
export function deriveTargetIndex(pos: Vec2, path: Vec2[]): TrackResult {
  // Handle trivial cases
  if (!path || path.length === 0) return { index: -1, distance: 0, t: 0 };
  if (path.length === 1) return { index: 0, distance: 0, t: 0 };

  // 1) Find the closest point on the polyline and the segment it lies on.
  let bestSeg: number = 0; // segment start index (segment is [i, i+1])
  let bestT: number = 0.0; // param along the best segment in [0, 1]
  let bestDist: number = 1e30; // large sentinel

  for (let i: number = 0; i < path.length - 1; i++) {
    // Consider the segment [a, b]
    const a = path[i]!;
    const b = path[i + 1]!;

    // ab is the segment direction vector, ap is the vector from a to the current position
    const ab = b.subbed(a);
    const ap = pos.subbed(a);

    // Squared length of the segment (avoids a costly sqrt). Used to normalize the projection
    const abLen2 = ab.dot(ab);
    let t: number = 0.0;

    if (abLen2 > 0) {
      // Project ap onto ab to get the parametric position along the infinite line
      // t < 0 => before a, t > 1 => past b
      t = ap.dot(ab) / abLen2;

      // Clamp to [0, 1] so the closest point stays on the finite segment
      if (t < 0.0) t = 0.0;
      else if (t > 1.0) t = 1.0;
    }

    // Closest point to pos on this segment
    const closest = a.added(ab.scaled(t));

    // Distance from pos to that closest point
    const d = pos.distanceTo(closest);

    // Keep the segment/point that yields the smallest distance so far
    if (d < bestDist) {
      bestDist = d;
      bestSeg = i;
      bestT = t;
    }
  }

  // 2) Base target index is the end of the closest segment.
  //    This biases forward progress (avoids bouncing back to the previous node).
  let idx: number = bestSeg + (bestT > 0.0 ? 1 : 0);

  // 3) Look-ahead: if we're close enough to the current target, advance.
  //    Threshold scales with the next segment length.
  while (idx < path.length - 1) {
    const segLen = path[idx]!.distanceTo(path[idx + 1]!);
    const advanceThreshold: number = Math.max(0.1, segLen * 0.25);
    if (pos.distanceTo(path[idx]!) <= advanceThreshold) {
      idx++;
    } else {
      break;
    }
  }

  return { index: idx, distance: bestDist, t: bestT };
}
