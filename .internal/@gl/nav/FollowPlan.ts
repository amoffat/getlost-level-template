import { inRing } from "@gl/utils/rand";
import { Vec2 } from "@gl/utils/vec2";
import { Waypoint } from "@gl/utils/waypoint";
import type { Character } from "@gl/utils/character";
import { tryToFindValid } from "./NavPlan";
import { NavPlan } from "./NavPlan";

export class FollowPlan extends NavPlan {
  private _target: Character;
  private _minDistance: number = 0;
  private _maxDistance: number = 0;
  private _pause: number = 0;

  constructor({
    target,
    minDistance = 0,
    maxDistance = 0,
    pause = 0,
  }: {
    target: Character;
    minDistance?: number;
    maxDistance?: number;
    pause?: number;
  }) {
    super();
    this._target = target;
    this._minDistance = minDistance;
    this._maxDistance = maxDistance;
    this._pause = pause;
  }

  public override async getNextWaypoint(
    curPos: Vec2,
  ): Promise<Waypoint | null> {
    const curTargetPos = this._target.getPos();

    if (this._maxDistance > 0) {
      const curDist = curTargetPos.distanceTo(curPos);
      if (curDist >= this._minDistance && curDist <= this._maxDistance) {
        return null;
      }

      for (let i = 0; i < tryToFindValid; i++) {
        const rndPos = inRing(this._minDistance, this._maxDistance);
        const candPos = curTargetPos.added(rndPos);

        if (await this._checkValid(curPos, candPos, true)) {
          const wp = new Waypoint(candPos.toVector());
          wp.pause = this._pause;
          wp.nearestIsOk = true;
          return wp;
        }
      }
    } else {
      const wp = new Waypoint(curTargetPos.toVector());
      wp.pause = this._pause;
      wp.nearestIsOk = true;
      return wp;
    }

    return null;
  }
}
