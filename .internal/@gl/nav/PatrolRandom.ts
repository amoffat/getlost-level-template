import { randInt } from "@gl/utils/rand";
import { Vec2 } from "@gl/utils/vec2";
import { Waypoint } from "@gl/utils/waypoint";
import { PatrolPlan } from "./PatrolPlan";

/**
 * Selects random waypoints to visit from a waypoint list
 */
export class PatrolRandom extends PatrolPlan {
  private _lastIdx: number = -1;

  public override async getNextWaypoint(_curPos: Vec2): Promise<Waypoint> {
    for (let i = 0; i < 3; i++) {
      const idx = randInt(0, this._waypoints.length - 1);
      if (idx !== this._lastIdx) {
        this._lastIdx = idx;
        return this._waypoints.at(idx)!;
      }
    }
    return this._waypoints[0]!;
  }
}
