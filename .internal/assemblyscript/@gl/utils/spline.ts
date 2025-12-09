import { Vec2 } from "./la/vec2";

// Catmull–Rom spline interpolation for 2D vectors. p0, p1, p2, p3 are
// consecutive control points. t is in [0, 1] between p1 and p2. Returns the
// interpolated point as a new Vec2.
export function catmullRom(
  p0: Vec2,
  p1: Vec2,
  p2: Vec2,
  p3: Vec2,
  t: number
): Vec2 {
  // Clamp t to [0,1] to avoid surprises
  if (t < 0) t = 0;
  if (t > 1) t = 1;

  const t2: number = t * t;
  const t3: number = t2 * t;

  // Using the standard Catmull–Rom basis matrix (uniform)
  // 0.5 * (  2P1
  //         +(-P0 + P2) t
  //         +(2P0 - 5P1 + 4P2 - P3) t^2
  //         +(-P0 + 3P1 - 3P2 + P3) t^3 )
  const half: number = 0.5;
  const two: number = 2.0;
  const three: number = 3.0;
  const four: number = 4.0;
  const five: number = 5.0;

  const x0: number = p0.x,
    y0: number = p0.y;
  const x1: number = p1.x,
    y1: number = p1.y;
  const x2: number = p2.x,
    y2: number = p2.y;
  const x3: number = p3.x,
    y3: number = p3.y;

  const x: number =
    half *
    (two * x1 +
      (-x0 + x2) * t +
      (two * x0 - five * x1 + four * x2 - x3) * t2 +
      (-x0 + three * x1 - three * x2 + x3) * t3);

  const y: number =
    half *
    (two * y1 +
      (-y0 + y2) * t +
      (two * y0 - five * y1 + four * y2 - y3) * t2 +
      (-y0 + three * y1 - three * y2 + y3) * t3);

  return new Vec2(x, y);
}

// Interpolate along a polyline using Catmull–Rom where endIndex is the segment
// end (i.e., interpolate from points[endIndex-1] to points[endIndex]) and t in
// [0,1]. Boundary conditions are handled by duplicating endpoints.
export function catmullRomAt(
  points: Vec2[],
  endIndex: number,
  t: number
): Vec2 {
  const n = points.length;
  if (n == 0) return new Vec2(0, 0);
  if (n == 1) return points[0]!;

  // Clamp endIndex to a valid range [0, n-1]
  if (endIndex < 0) endIndex = 0;
  if (endIndex > n - 1) endIndex = n - 1;

  // Compute control point indices with endpoint duplication
  let i0 = endIndex - 2;
  let i1 = endIndex - 1;
  let i2 = endIndex;
  let i3 = endIndex + 1;

  if (i0 < 0) i0 = 0;
  if (i1 < 0) i1 = 0;
  if (i2 > n - 1) i2 = n - 1;
  if (i3 > n - 1) i3 = n - 1;

  return catmullRom(points[i0]!, points[i1]!, points[i2]!, points[i3]!, t);
}
