import { Vec2 } from "./la/vec2";
import { Polygon } from "./polygon";

export class Box {
  upperLeft: Vec2;
  lowerRight: Vec2;

  private constructor(upperLeft: Vec2, lowerRight: Vec2) {
    this.upperLeft = upperLeft;
    this.lowerRight = lowerRight;
  }

  static fromPoints(upperLeft: Vec2, lowerRight: Vec2): Box {
    return new Box(upperLeft, lowerRight);
  }

  static fromWidthHeight(x: f32, y: f32, width: f32, height: f32): Box {
    const upperLeft = new Vec2(x, y);
    return new Box(upperLeft, upperLeft.added(new Vec2(width, height)));
  }

  add(other: Vec2): Box {
    return new Box(this.upperLeft.added(other), this.lowerRight.added(other));
  }

  get x(): f32 {
    return this.upperLeft.x;
  }

  get y(): f32 {
    return this.upperLeft.y;
  }

  get width(): f32 {
    return this.lowerRight.x - this.upperLeft.x;
  }

  get height(): f32 {
    return this.lowerRight.y - this.upperLeft.y;
  }

  get size(): Vec2 {
    return new Vec2(this.width, this.height);
  }

  // If they overlap, or one contains the other, return true
  overlaps(other: Box): boolean {
    return (
      this.upperLeft.x < other.lowerRight.x &&
      this.lowerRight.x > other.upperLeft.x &&
      this.upperLeft.y < other.lowerRight.y &&
      this.lowerRight.y > other.upperLeft.y
    );
  }

  contains(other: Box): boolean {
    return (
      this.upperLeft.x <= other.upperLeft.x &&
      this.upperLeft.y <= other.upperLeft.y &&
      this.lowerRight.x >= other.lowerRight.x &&
      this.lowerRight.y >= other.lowerRight.y
    );
  }

  containsPoint(point: Vec2): boolean {
    return (
      this.upperLeft.x <= point.x &&
      this.lowerRight.x >= point.x &&
      this.upperLeft.y <= point.y &&
      this.lowerRight.y >= point.y
    );
  }

  get polygon(): Polygon {
    const vertices = new Polygon();
    vertices.vertices.push(new Vec2(this.upperLeft.x, this.upperLeft.y));
    vertices.vertices.push(new Vec2(this.lowerRight.x, this.upperLeft.y));
    vertices.vertices.push(new Vec2(this.lowerRight.x, this.lowerRight.y));
    vertices.vertices.push(new Vec2(this.upperLeft.x, this.lowerRight.y));
    return vertices;
  }

  raycast(origin: Vec2, direction: Vec2): Vec2[] | null {
    const invDir = new Vec2(1 / direction.x, 1 / direction.y);

    // Find t values for intersection with box planes
    const t1 = (this.upperLeft.x - origin.x) * invDir.x;
    const t2 = (this.lowerRight.x - origin.x) * invDir.x;
    const t3 = (this.upperLeft.y - origin.y) * invDir.y;
    const t4 = (this.lowerRight.y - origin.y) * invDir.y;

    // Swap t1 and t2 if necessary
    const tMinX = Math.min(t1, t2) as f32;
    const tMaxX = Math.max(t1, t2) as f32;

    // Swap t3 and t4 if necessary
    const tMinY = Math.min(t3, t4) as f32;
    const tMaxY = Math.max(t3, t4) as f32;

    // Calculate the overall tMin and tMax
    const tMin = Math.max(tMinX, tMinY) as f32;
    const tMax = Math.min(tMaxX, tMaxY) as f32;

    // If tMax < tMin, the ray misses the box
    if (tMax < tMin || tMax < 0) {
      return null;
    }

    const intersections: Vec2[] = [];
    if (tMin >= 0) {
      intersections.push(origin.added(direction.scaled(tMin)));
    }
    if (tMax >= 0) {
      intersections.push(origin.added(direction.scaled(tMax)));
    }

    return intersections.length > 0 ? intersections : null;
  }

  get center(): Vec2 {
    return this.upperLeft.added(this.size.scaled(0.5));
  }

  toString(this: Box): string {
    return `Box(${this.upperLeft.toString()}, ${this.lowerRight.toString()})`;
  }
}
