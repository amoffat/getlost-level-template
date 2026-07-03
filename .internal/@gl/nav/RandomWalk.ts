import { randFloat } from "@gl/utils/rand";
import { Vec2 } from "@gl/utils/vec2";
import { Waypoint } from "@gl/utils/waypoint";
import { NavPlan } from "./NavPlan";

export class RandomWalk extends NavPlan {
  private _maxDistance: number;
  private _minPause: number;
  private _maxPause: number;

  constructor({
    maxDistance,
    minPause,
    maxPause,
  }: {
    maxDistance: number;
    minPause?: number;
    maxPause?: number;
  }) {
    super();
    this._maxDistance = maxDistance;
    this._minPause = minPause ?? 0;
    this._maxPause = maxPause ?? this._minPause;
  }

  public override async getNextWaypoint(
    curPos: Vec2,
  ): Promise<Waypoint | null> {
    const wp = await this._randomInCircle(curPos, this._maxDistance);
    if (wp) {
      wp.pause = randFloat(this._minPause, this._maxPause);
      wp.nearestIsOk = true;
    }
    return wp;
  }
}
