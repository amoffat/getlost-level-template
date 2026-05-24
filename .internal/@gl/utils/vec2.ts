import { type Vector2 } from "@gl/types/api/vector";
import type { EasingFunction } from "./easing";

export class Vec2 implements Vector2 {
  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  static zero(): Vec2 {
    return new Vec2(0, 0);
  }

  static fromVector(vec: Vector2): Vec2 {
    return new Vec2(vec.x, vec.y);
  }

  static fromVal(value: number): Vec2 {
    return new Vec2(value, value);
  }

  static fromMagnitude(mag: number) {
    const comp = (mag * Math.sqrt(2)) / 2;
    return new Vec2(comp, comp);
  }

  public toVector(): Vector2 {
    return { x: this.x, y: this.y };
  }

  public set(x: number, y: number): Vec2 {
    this.x = x;
    this.y = y;
    return this;
  }

  min(other: Vector2): Vec2 {
    this.x = Math.min(this.x, other.x);
    this.y = Math.min(this.y, other.y);
    return this;
  }

  minned(other: Vector2): Vec2 {
    return this.clone().min(other);
  }

  max(other: Vector2): Vec2 {
    this.x = Math.max(this.x, other.x);
    this.y = Math.max(this.y, other.y);
    return this;
  }

  multiply(other: Vector2): Vec2 {
    this.x *= other.x;
    this.y *= other.y;
    return this;
  }

  multiplied(other: Vector2): Vec2 {
    return this.clone().multiply(other);
  }

  divide(other: Vector2): Vec2 {
    this.x /= other.x;
    this.y /= other.y;
    return this;
  }

  divided(other: Vector2): Vec2 {
    return this.clone().divide(other);
  }

  maxed(other: Vector2): Vec2 {
    return this.clone().max(other);
  }

  add(other: Vector2): Vec2 {
    this.x += other.x;
    this.y += other.y;
    return this;
  }

  added(other: Vector2): Vec2 {
    return this.clone().add(other);
  }

  sub(other: Vector2): Vec2 {
    this.x -= other.x;
    this.y -= other.y;
    return this;
  }

  subbed(other: Vector2): Vec2 {
    return this.clone().sub(other);
  }

  // Dot product of this vector and another
  dot(other: Vector2): number {
    return this.x * other.x + this.y * other.y;
  }

  cap(v: Vec2): Vec2 {
    if (this.magnitude > v.magnitude) {
      this.normalize().scale(v.magnitude);
    }
    return this;
  }

  capped(v: Vec2): Vec2 {
    return this.clone().cap(v);
  }

  // Cap the vector to a certain length, if its magnitude is greater
  capScalar(v: number): Vec2 {
    if (this.magnitude > v) {
      return this.normalize().scale(v);
    }
    return this;
  }

  cappedScalar(v: number): Vec2 {
    return this.clone().capScalar(v);
  }

  flip(): Vec2 {
    this.x = -this.x;
    this.y = -this.y;
    return this;
  }

  flipped(): Vec2 {
    return this.clone().flip();
  }

  // Smooth the vector using an easing function. Useful for simulating a gamepad
  // thumbstick, where the input should be less sensitive near the center.
  smoothed(easing: EasingFunction) {
    const magnitude = this.magnitude;

    // Avoid division by zero for zero vector
    if (magnitude === 0) {
      return new Vec2(0, 0);
    }

    const smoothedMagnitude = easing(magnitude);
    const scale = smoothedMagnitude / magnitude;

    return new Vec2(this.x * scale, this.y * scale);
  }

  normalize(scale: number = 1): Vec2 {
    const mag = this.magnitude / scale;
    if (mag === 0) {
      return this;
    }
    this.x /= mag;
    this.y /= mag;
    return this;
  }

  normalized(scale: number = 1): Vec2 {
    return this.clone().normalize(scale);
  }

  lerp(v2: Vector2, t: number): Vec2 {
    this.x = this.x + (v2.x - this.x) * t;
    this.y = this.y + (v2.y - this.y) * t;
    return this;
  }

  lerped(v2: Vector2, t: number): Vec2 {
    return this.clone().lerp(v2, t);
  }

  get magnitude(): number {
    return Math.hypot(this.x, this.y);
  }

  get isZero(): boolean {
    return this.x === 0 && this.y === 0;
  }

  diffMag(other: Vector2): number {
    return Math.hypot(this.x - other.x, this.y - other.y);
  }

  scale(scalar: number): Vec2 {
    this.x *= scalar;
    this.y *= scalar;
    return this;
  }

  scaled(scalar: number): Vec2 {
    return this.clone().scale(scalar);
  }

  // Get perpendicular vector (normal to the edge)
  perp(): Vec2 {
    return new Vec2(-this.y, this.x);
  }

  clone(): Vec2 {
    return new Vec2(this.x, this.y);
  }

  round(): Vec2 {
    this.x = Math.round(this.x);
    this.y = Math.round(this.y);
    return this;
  }

  rounded(): Vec2 {
    return this.clone().round();
  }

  toString(): string {
    return `Vec2(${this.x}, ${this.y})`;
  }

  equals(other: Vector2): boolean {
    return this.x === other.x && this.y === other.y;
  }

  approxEquals(other: Vector2, epsilon: number): boolean {
    return (
      Math.abs(this.x - other.x) < epsilon &&
      Math.abs(this.y - other.y) < epsilon
    );
  }

  distanceTo(other: Vector2): number {
    return Math.hypot(this.x - other.x, this.y - other.y);
  }

  truncate(threshold: number): Vec2 {
    if (this.magnitude < threshold) {
      this.x = 0;
      this.y = 0;
    }
    return this;
  }

  // Using `this` as the start point, find the point on the line segment between
  // `this` and `end` that satisfies the predicate.
  bisect({
    end,
    predicate,
    epsilon = 1e-6,
  }: {
    end: Vec2;
    predicate: (point: Vec2) => boolean;
    epsilon?: number;
  }): Vec2 | null {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let low: Vec2 = this;
    let high = end;

    // Ensure one of the points satisfies the predicate to begin with
    if (!predicate(low) && !predicate(high)) {
      return null; // No solution exists
    }

    while (high.distanceTo(low) > epsilon) {
      const mid = low.added(high).scale(0.5);

      if (predicate(mid)) {
        high = mid; // Narrow down to the first half
      } else {
        low = mid; // Narrow down to the second half
      }
    }

    if (predicate(low)) {
      return low;
    } else if (predicate(high)) {
      return high;
    }

    return null;
  }
}
