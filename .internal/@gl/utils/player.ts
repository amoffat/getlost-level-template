import * as player from "@gl/api/player";
import { CharAction } from "@gl/types/character";
import { Character } from "./character";
import { Delay } from "./delay";
import { Vec2 } from "./vec2";

export class Player extends Character {
  private _hurtCooldown: Delay = new Delay(1000);
  private _invincible: boolean = false;

  constructor() {
    super("player");
  }

  protected override getMoveAction(dir: Vec2): CharAction {
    return dir.x < 0 ? CharAction.WalkLeft : CharAction.WalkRight;
  }

  public override hurt(dir: Vec2): boolean {
    if (this._invincible) return false;

    super.hurt(dir);

    this._invincible = true;
    this._hurtCooldown.reset();
    return true;
  }

  public override async tick(deltaMS: number): Promise<void> {
    if (this._hurtCooldown.tick(deltaMS)) {
      this._invincible = false;
    }
    await super.tick(deltaMS);
  }

  public setGuideTarget(char: Character): void {
    const pos = char.getPos().subbed(new Vec2(0, 10));
    player.setGuideTarget(pos.x, pos.y);
  }
}
