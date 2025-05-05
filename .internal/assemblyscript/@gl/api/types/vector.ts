import { Vec2 } from "../../utils/la/vec2";

export class Vector {
  x: f32 = 0;
  y: f32 = 0;

  toVec2(): Vec2 {
    return new Vec2(this.x, this.y);
  }
}
