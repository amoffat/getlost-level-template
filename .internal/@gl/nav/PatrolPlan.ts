import { Vec2 } from "@gl/utils/vec2";
import { Waypoint } from "@gl/utils/waypoint";
import { NavPlan } from "./NavPlan";

/**
 * Cycles through a set of waypoints.
 */
export class PatrolPlan extends NavPlan {
  protected _waypoints: Waypoint[];
  private i: number = 0;

  constructor(waypoints: Waypoint[]) {
    super();
    this._waypoints = waypoints;
  }

  public override async getNextWaypoint(
    _curPos: Vec2,
  ): Promise<Waypoint | null> {
    const wp = this._waypoints[this.i]!;
    this.i = (this.i + 1) % this._waypoints.length;
    return wp;
  }
}
