import { inCircle } from "@gl/utils/rand";
import { Vec2 } from "@gl/utils/vec2";
import { Waypoint } from "@gl/utils/waypoint";
import { tryToFindValid } from "./NavPlan";
import { PatrolPlan } from "./PatrolPlan";

export class PatrolRandomDetours extends PatrolPlan {
  private _maxDistance: number;
  private _randomCounter: number = 0;
  private _maxRandom: number = 3;

  constructor(
    waypoints: Waypoint[],
    maxDistance: number,
    maxRandom: number = 3,
  ) {
    super(waypoints);
    this._maxDistance = maxDistance;
    this._maxRandom = maxRandom;
  }

  public override async getNextWaypoint(
    curPos: Vec2,
  ): Promise<Waypoint | null> {
    const useRandom = this._randomCounter < this._maxRandom;

    if (useRandom) {
      const wp = await this._randomWaypoint(curPos);
      this._randomCounter++;
      return wp;
    }
    this._randomCounter = 0;
    return await super.getNextWaypoint(curPos);
  }

  private async _randomWaypoint(curPos: Vec2): Promise<Waypoint | null> {
    for (let i = 0; i < tryToFindValid; i++) {
      const rndPos = inCircle(this._maxDistance);
      const candPos = curPos.added(rndPos);
      if (await this._checkValid(curPos, candPos, true)) {
        const wp = new Waypoint(candPos.toVector());
        wp.nearestIsOk = true;
        return wp;
      }
    }
    return null;
  }
}
