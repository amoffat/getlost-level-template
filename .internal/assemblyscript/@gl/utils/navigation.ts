import { Vector } from "../api/types/vector";
import * as host from "../api/w2h/host";
import { Vec2 } from "./la/vec2";
import { nullWaypoint, Waypoint } from "./waypoint";

export abstract class NavPlan {
  public abstract getNextWaypoint(curPos: Vec2): Waypoint;
  public abstract hasNextWaypoint(curPos: Vec2): bool;
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

  public getNextWaypoint(_curPos: Vec2): Waypoint {
    return new Waypoint(this._position.toVector());
  }

  public hasNextWaypoint(_curPos: Vec2): bool {
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

  public getNextWaypoint(_curPos: Vec2): Waypoint {
    const wp = this._waypoints[this.i];
    this.i = (this.i + 1) % this._waypoints.length;
    return wp;
  }

  public hasNextWaypoint(_curPos: Vec2): bool {
    return true;
  }
}

export class RandomPlan extends PatrolPlan {
  private _maxDistance: f32;
  private _randomCounter: i32 = 0;
  private _maxRandom: i32 = 3;

  constructor(waypoints: Waypoint[], maxDistance: f32, maxRandom: i32 = 3) {
    super(waypoints);
    this._maxDistance = maxDistance;
    this._maxRandom = maxRandom;
  }

  public getNextWaypoint(_curPos: Vec2): Waypoint {
    const useRandom = this._randomCounter < this._maxRandom;

    if (useRandom) {
      const wp = this.randomWaypoint(_curPos);
      if (!wp.isNull) {
        this._randomCounter++;
        return wp;
      }
    }
    this._randomCounter = 0;
    return super.getNextWaypoint(_curPos);
  }

  private randomWaypoint(curPos: Vec2): Waypoint {
    const rnd = Vec2.randomNorm().scale(this._maxDistance);
    const path = host.navigation.findPath(
      "",
      curPos.toVector(),
      curPos.added(rnd).toVector(),
      true
    );
    if (path.length > 0) {
      const wpPos = path[path.length - 1];
      const wp = new Waypoint(wpPos);
      return wp;
    }
    return nullWaypoint;
  }
}
