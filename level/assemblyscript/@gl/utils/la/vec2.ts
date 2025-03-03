export class Vec2 {
  x: f32;
  y: f32;

  constructor(x: f32, y: f32) {
    this.x = x;
    this.y = y;
  }

  static fromVal(value: f32): Vec2 {
    return new Vec2(value, value);
  }

  min(other: Vec2): Vec2 {
    this.x = Math.min(this.x, other.x);
    this.y = Math.min(this.y, other.y);
    return this;
  }

  minned(other: Vec2): Vec2 {
    return this.clone().min(other);
  }

  max(other: Vec2): Vec2 {
    this.x = Math.max(this.x, other.x);
    this.y = Math.max(this.y, other.y);
    return this;
  }

  maxed(other: Vec2): Vec2 {
    return this.clone().max(other);
  }

  multiply(other: Vec2): Vec2 {
    this.x *= other.x;
    this.y *= other.y;
    return this;
  }

  multiplied(other: Vec2): Vec2 {
    return this.clone().multiply(other);
  }

  divide(other: Vec2): Vec2 {
    this.x /= other.x;
    this.y /= other.y;
    return this;
  }

  divided(other: Vec2): Vec2 {
    return this.clone().divide(other);
  }

  add(other: Vec2): Vec2 {
    this.x += other.x;
    this.y += other.y;
    return this;
  }

  added(other: Vec2): Vec2 {
    return this.clone().add(other);
  }

  sub(other: Vec2): Vec2 {
    this.x -= other.x;
    this.y -= other.y;
    return this;
  }

  subbed(other: Vec2): Vec2 {
    return this.clone().sub(other);
  }

  dot(other: Vec2): f32 {
    return this.x * other.x + this.y * other.y;
  }

  // Cap the vector to a certain length, if its magnitude is greater
  cap(v: Vec2): Vec2 {
    if (this.magnitude > v.magnitude) {
      this.normalize().scale(v.magnitude);
    }
    return this;
  }

  capped(v: Vec2): Vec2 {
    return this.clone().cap(v);
  }

  capScalar(v: f32): Vec2 {
    if (this.magnitude > v) {
      return this.normalize().scale(v);
    }
    return this;
  }

  cappedScalar(v: f32): Vec2 {
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

  smoothed(easing: (t: f32) => f32): Vec2 {
    const magnitude = this.magnitude;

    if (magnitude === 0) {
      return new Vec2(0, 0);
    }

    const smoothedMagnitude = easing(magnitude);
    const scale = smoothedMagnitude / magnitude;

    return new Vec2(this.x * scale, this.y * scale);
  }

  normalize(): Vec2 {
    const mag = this.magnitude;
    if (mag === 0) {
      return this;
    }
    this.x /= mag;
    this.y /= mag;
    return this;
  }

  normalized(): Vec2 {
    return this.clone().normalize();
  }

  lerp(v2: Vec2, t: f32): Vec2 {
    this.x = this.x + (v2.x - this.x) * t;
    this.y = this.y + (v2.y - this.y) * t;
    return this;
  }

  lerped(v2: Vec2, t: f32): Vec2 {
    return this.clone().lerp(v2, t);
  }

  get magnitude(): f32 {
    return Math.sqrt(this.x * this.x + this.y * this.y) as f32;
  }

  scale(scalar: f32): Vec2 {
    this.x *= scalar;
    this.y *= scalar;
    return this;
  }

  scaled(scalar: f32): Vec2 {
    return this.clone().scale(scalar);
  }

  perp(): Vec2 {
    return new Vec2(-this.y, this.x);
  }

  clone(): Vec2 {
    return new Vec2(this.x, this.y);
  }

  toString(): string {
    return `Vec2(${this.x}, ${this.y})`;
  }

  equals(other: Vec2): bool {
    return this.x === other.x && this.y === other.y;
  }

  approxEquals(other: Vec2, epsilon: f32): bool {
    return (
      Math.abs(this.x - other.x) < epsilon &&
      Math.abs(this.y - other.y) < epsilon
    );
  }

  truncate(threshold: f32): Vec2 {
    if (this.magnitude < threshold) {
      this.x = 0;
      this.y = 0;
    }
    return this;
  }
}
