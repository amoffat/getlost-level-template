import { Vec2 } from "./vec2";

export class Matrix {
  a: f32 = 1.0;
  b: f32 = 0.0;
  c: f32 = 0.0;
  d: f32 = 1.0;
  tx: f32 = 0.0;
  ty: f32 = 0.0;

  set(m11: f32, m12: f32, m21: f32, m22: f32, dx: f32, dy: f32): void {
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

  translate(t: Vec2): void {
    this.tx += t.x * this.a + t.y * this.c;
    this.ty += t.x * this.b + t.y * this.d;
  }

  scale(scale: Vec2): void {
    this.a *= scale.x;
    this.b *= scale.x;
    this.c *= scale.y;
    this.d *= scale.y;
  }

  rotate(angle: f32): void {
    const cos = Mathf.cos(angle);
    const sin = Mathf.sin(angle);

    const m11 = this.a * cos + this.b * sin;
    const m12 = -this.a * sin + this.b * cos;
    const m21 = this.c * cos + this.d * sin;
    const m22 = -this.c * sin + this.d * cos;

    this.a = m11;
    this.b = m12;
    this.c = m21;
    this.d = m22;
  }

  apply(point: Vec2): Vec2 {
    const newX = point.x * this.a + point.y * this.c + this.tx;
    const newY = point.x * this.b + point.y * this.d + this.ty;
    return new Vec2(newX, newY);
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
}
