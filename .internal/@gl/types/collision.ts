import { Vec2 } from "../utils/la/vec2";

export class CollisionResult {
  constructor(
    public collided: boolean = false,
    public collisionNormal: Vec2 | null = null
  ) {}
}
