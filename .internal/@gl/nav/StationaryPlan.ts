import * as navigation from "@gl/api/navigation";

import { type Vector2 } from "@gl/types/api/vector";
import { Vec2 } from "@gl/utils/vec2";
import { Waypoint } from "@gl/utils/waypoint";
import { NavPlan } from "./NavPlan";

/**
 * Stays at the current position.
 */
export class StationaryPlan extends NavPlan {
  private _position: Vec2;

  constructor(position: Vector2) {
    super();
    this._position = Vec2.fromVector2(position);
  }

  static fromWaypoint(name: string): StationaryPlan {
    const wp = navigation.getWaypointByName(name);
    return new StationaryPlan(wp?.pos ?? { x: 0, y: 0 });
  }

  public override async getNextWaypoint(_curPos: Vec2): Promise<Waypoint> {
    return new Waypoint({ pos: this._position.toVector() });
  }

  public override hasNextWaypoint(_curPos: Vec2): boolean {
    return false;
  }
}
