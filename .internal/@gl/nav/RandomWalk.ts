import { randFloat } from "@gl/utils/rand";
import { Vec2 } from "@gl/utils/vec2";
import { Waypoint } from "@gl/utils/waypoint";
import { NavPlan } from "./NavPlan";

/**
 * Predicate used to decide whether a candidate waypoint is acceptable.
 *
 * @param candPos The candidate position being considered.
 */
export type IsCandidateValid = (candPos: Vec2) => boolean;

export class RandomWalk extends NavPlan {
  private _walkDistance: number;
  private _minPause: number;
  private _maxPause: number;
  private _isCandidateValid?: IsCandidateValid;

  constructor({
    walkDistance,
    minPause,
    maxPause,
    isCandidateValid,
  }: {
    walkDistance: number;
    minPause?: number;
    maxPause?: number;
    isCandidateValid?: IsCandidateValid;
  }) {
    super();
    this._walkDistance = walkDistance;
    this._minPause = minPause ?? 0;
    this._maxPause = maxPause ?? this._minPause;
    this._isCandidateValid = isCandidateValid;
  }

  public override async getNextWaypoint(
    curPos: Vec2,
  ): Promise<Waypoint | null> {
    const wp = await this._randomInCircle(
      curPos,
      this._walkDistance,
      this._isCandidateValid,
    );
    if (wp) {
      wp.pause = randFloat(this._minPause, this._maxPause);
      wp.nearestIsOk = true;
    }
    return wp;
  }
}
