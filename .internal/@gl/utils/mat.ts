import { Vector2 } from "@gl/types/api/vector";

export class Matrix {
  a: number = 1.0;
  b: number = 0.0;
  c: number = 0.0;
  d: number = 1.0;
  tx: number = 0.0;
  ty: number = 0.0;

  set(
    m11: number,
    m12: number,
    m21: number,
    m22: number,
    dx: number,
    dy: number,
  ): void {
    this.a = m11;
    this.b = m12;
    this.c = m21;
    this.d = m22;
    this.tx = dx;
    this.ty = dy;
  }

  multiply(other: Matrix): void {
    const m11 = this.a * other.a + this.b * other.c;
    const m12 = this.a * other.b + this.b * other.d;
    const m21 = this.c * other.a + this.d * other.c;
    const m22 = this.c * other.b + this.d * other.d;
    const dx = this.tx * other.a + this.ty * other.c + other.tx;
    const dy = this.tx * other.b + this.ty * other.d + other.ty;

    this.a = m11;
    this.b = m12;
    this.c = m21;
    this.d = m22;
    this.tx = dx;
    this.ty = dy;
  }

  translate(t: Vector2): void {
    this.tx += t.x * this.a + t.y * this.c;
    this.ty += t.x * this.b + t.y * this.d;
  }

  scale(scale: Vector2): void {
    this.a *= scale.x;
    this.b *= scale.x;
    this.c *= scale.y;
    this.d *= scale.y;
  }

  rotate(angle: number): void {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    const m11 = this.a * cos + this.b * sin;
    const m12 = -this.a * sin + this.b * cos;
    const m21 = this.c * cos + this.d * sin;
    const m22 = -this.c * sin + this.d * cos;

    this.a = m11;
    this.b = m12;
    this.c = m21;
    this.d = m22;
  }

  apply(point: Vector2): Vector2 {
    const newX = point.x * this.a + point.y * this.c + this.tx;
    const newY = point.x * this.b + point.y * this.d + this.ty;
    return { x: newX, y: newY };
  }

  clone(): Matrix {
    const m = new Matrix();
    m.a = this.a;
    m.b = this.b;
    m.c = this.c;
    m.d = this.d;
    m.tx = this.tx;
    m.ty = this.ty;
    return m;
  }

  toArray(): Float32Array {
    return new Float32Array([this.a, this.b, this.c, this.d, this.tx, this.ty]);
  }

  static fromArray(arr: Float32Array): Matrix {
    const m = new Matrix();
    m.a = arr[0];
    m.b = arr[1];
    m.c = arr[2];
    m.d = arr[3];
    m.tx = arr[4];
    m.ty = arr[5];
    return m;
  }
}
