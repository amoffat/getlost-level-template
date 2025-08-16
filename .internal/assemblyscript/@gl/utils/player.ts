import { Character, CharAction } from "./character";
import { Vec2 } from "./la/vec2";

export class Player extends Character {
  constructor() {
    super("player");
  }

  getAction(velocity: Vec2): CharAction {
    return velocity.x < 0 ? CharAction.WalkLeft : CharAction.WalkRight;
  }
}
