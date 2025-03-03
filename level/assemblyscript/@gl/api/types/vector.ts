import { Vec2 } from "../../utils/la/vec2";

export class Vector {
  x!: f32;
  y!: f32;

  toVec2(): Vec2 {
    return new Vec2(this.x, this.y);
  }
}
