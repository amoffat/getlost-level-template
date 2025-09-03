import * as host from "../api/w2h/host";
import { Character, CharAction } from "./character";
import { Delay } from "./delay";
import { Vec2 } from "./la/vec2";

export class Player extends Character {
  private _hurtCooldown: Delay = new Delay(1000);
  private _invincible: boolean = false;
  private _guideTarget: Vec2 = Vec2.null();

  constructor() {
    super("player");
  }

  protected getMoveAction(velocity: Vec2): CharAction {
    return velocity.x < 0 ? CharAction.WalkLeft : CharAction.WalkRight;
  }

  public hurt(dir: Vec2): bool {
    if (this._invincible) return false;

    this.setAction(CharAction.HurtLeft, 200);
    this.addImpulse(dir.scaled(-150));
    this._invincible = true;
    this._hurtCooldown.reset();
    return true;
  }

  public tick(deltaMS: f32): void {
    if (this._hurtCooldown.tick(deltaMS)) {
      this._invincible = false;
    }
    super.tick(deltaMS);
  }

  public setGuideTarget(char: Character): void {
    const pos = char.pos.subbed(new Vec2(0, 10));
    this._guideTarget = pos;
    host.player.setGuideTarget(pos.x, pos.y);
  }
}
