import type { Character } from "@gl/utils/character";
import { Delay } from "@gl/utils/delay";
import { Vec2 } from "@gl/utils/vec2";
import { Waypoint } from "@gl/utils/waypoint";
import { NavPlan } from "./NavPlan";

/**
 * Attacks when the target is near, otherwise uses a default waypoint. Good for
 * animals.
 */
export abstract class AggressiveBasePlan extends NavPlan {
  private _target: Character;
  private _attackDistance: number;
  private _cooldown: Delay = new Delay(2000);
  private _attacking: boolean = false;

  constructor({
    target,
    attackDistance,
  }: {
    target: Character;
    attackDistance: number;
  }) {
    super();
    this._target = target;
    this._attackDistance = attackDistance;
  }

  protected async _targetIsNear(pos: Vec2): Promise<boolean> {
    // Performance optimization
    const withinRad = this._normDistance(pos) < 1.0;
    if (withinRad) {
      return this._checkValid(
        pos,
        this._target.getPos(),
        true,
        this._attackDistance,
      );
    }
    return false;
  }

  // The distance to the target, normalized by the attack distance, so that 0 is
  // right next to the target and 1 is at the attack distance.
  protected _normDistance(pos: Vec2): number {
    return this._target.getPos().distanceTo(pos) / this._attackDistance;
  }

  protected abstract _defaultWaypoint(curPos: Vec2): Promise<Waypoint | null>;

  protected _shouldAttack(_curPos: Vec2): boolean {
    return true;
  }

  public override async getNextWaypoint(
    curPos: Vec2,
  ): Promise<Waypoint | null> {
    if (
      (await this._targetIsNear(curPos)) &&
      this._shouldAttack(curPos) &&
      !this._attacking
    ) {
      const nd = this._normDistance(curPos);
      const wp = new Waypoint(this._target.getPos().toVector());
      wp.pause = nd * 1000 + 100;
      wp.nearestIsOk = true;
      this._attacking = true;
      return wp;
    }
    this._attacking = false;
    return this._defaultWaypoint(curPos);
  }

  public override async tick(deltaMS: number, curPos: Vec2): Promise<boolean> {
    if (!this._attacking && this._cooldown.tick(deltaMS)) {
      if (await this._targetIsNear(curPos)) {
        // As we get closer to the target, less cooldown
        const checkTime = this._normDistance(curPos) * 1900 + 200;
        this._cooldown.timeMs = checkTime;
        return true;
      }
    }
    return false;
  }
}
