import { Vector } from "../api/types/vector";
import { Vec2 } from "./la/vec2";
import { Waypoint } from "./waypoint";

export abstract class NavPlan {
  abstract get nextWaypoint(): Vec2;
  abstract get hasNextWaypoint(): bool;
}

/**
 * Stays at the current position.
 */
export class StationaryPlan extends NavPlan {
  private _position: Vec2;

  constructor(position: Vector) {
    super();
    this._position = Vec2.fromVector(position);
  }

  get nextWaypoint(): Vec2 {
    return this._position;
  }

  get hasNextWaypoint(): bool {
    return false;
  }
}

/**
 * Cycles through a set of waypoints.
 */
export class PatrolPlan extends NavPlan {
  private _waypoints: Waypoint[];
  private i: i32 = 0;

  constructor(waypoints: Waypoint[]) {
    super();
    this._waypoints = waypoints;
  }

  get nextWaypoint(): Vec2 {
    const pos = this._waypoints[this.i].pos;
    this.i = (this.i + 1) % this._waypoints.length;
    return pos;
  }

  get hasNextWaypoint(): bool {
    return true;
  }
}
