import { Vector } from "../api/types/vector";
import * as host from "../api/w2h/host";
import { Character } from "./character";
import { Vec2 } from "./la/vec2";
import { float, inCircle, inRing, int } from "./rand";
import { nullWaypoint, Waypoint } from "./waypoint";

const tryToFindValid: i32 = 10;

export abstract class NavPlan {
  public abstract getNextWaypoint(curPos: Vec2): Waypoint;
  public hasNextWaypoint(_curPos: Vec2): bool {
    return true;
  }

  protected _checkValid(start: Vec2, end: Vec2, nearestIsOk: bool): bool {
    const path = host.navigation.findPath(
      "",
      start.toVector(),
      end.toVector(),
      nearestIsOk
    );
    return path.length > 0;
  }
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

export class RandomWalk extends NavPlan {
  private _maxDistance: f32;

  constructor(maxDistance: f32) {
    super();
    this._maxDistance = maxDistance;
  }

  public getNextWaypoint(curPos: Vec2): Waypoint {
    let wp = nullWaypoint;

    for (let i = 0; i < tryToFindValid; i++) {
      const rndPos = inCircle(this._maxDistance);
      const candPos = curPos.added(rndPos);
      if (this._checkValid(curPos, candPos, true)) {
        wp = new Waypoint(candPos.toVector());
        wp.pause = float(100, 2000);
        break;
      }
    }
    wp.nearestIsOk = true;
    return wp;
  }
}

export class RandomInCirclePlan extends NavPlan {
  private _around: Waypoint;
  private _maxDistance: f32;

  constructor(around: Waypoint, maxDistance: f32) {
    super();
    this._around = around;
    this._maxDistance = maxDistance;
  }

  public getNextWaypoint(_curPos: Vec2): Waypoint {
    const center = this._around.pos;
    let wp = nullWaypoint;

    for (let i = 0; i < tryToFindValid; i++) {
      const rndPos = inCircle(this._maxDistance);
      const candPos = center.added(rndPos);
      if (this._checkValid(center, candPos, true)) {
        wp = new Waypoint(candPos.toVector());
        break;
      }
    }
    wp.nearestIsOk = true;
    return wp;
  }
}

/**
 * Cycles through a set of waypoints.
 */
export class PatrolPlan extends NavPlan {
  protected _waypoints: Waypoint[];
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
}

/**
 * Selects random waypoints to visit from a waypoint list
 */
export class PatrolRandom extends PatrolPlan {
  private _lastIdx: i32 = -1;

  public getNextWaypoint(_curPos: Vec2): Waypoint {
    for (let i = 0; i < 3; i++) {
      const idx = int(0, this._waypoints.length - 1);
      if (idx !== this._lastIdx) {
        this._lastIdx = idx;
        return this._waypoints.at(idx);
      }
    }
    return this._waypoints[0];
  }
}

export class PatrolRandomDetours extends PatrolPlan {
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
      this._randomCounter++;
      return wp;
    }
    this._randomCounter = 0;
    return super.getNextWaypoint(_curPos);
  }

  private randomWaypoint(curPos: Vec2): Waypoint {
    let wp = nullWaypoint;

    for (let i = 0; i < tryToFindValid; i++) {
      const rndPos = inCircle(this._maxDistance);
      const candPos = curPos.added(rndPos);
      if (this._checkValid(curPos, candPos, true)) {
        wp = new Waypoint(candPos.toVector());
        break;
      }
    }
    wp.nearestIsOk = true;
    return wp;
  }
}

export class FollowPlan extends NavPlan {
  private _target: Character;
  private _minDistance: f32 = 0;
  private _maxDistance: f32 = 0;
  private _pause: f32 = 0;

  constructor(
    target: Character,
    minDistance: f32 = 0,
    maxDistance: f32 = 0,
    pause: f32 = 0
  ) {
    super();
    this._target = target;
    this._minDistance = minDistance;
    this._maxDistance = maxDistance;
    this._pause = pause;
  }

  public getNextWaypoint(_curPos: Vec2): Waypoint {
    let wp: Waypoint = nullWaypoint;

    if (this._maxDistance > 0) {
      for (let i = 0; i < tryToFindValid; i++) {
        const rndPos = inRing(this._minDistance, this._maxDistance);
        const candPos = this._target.pos.added(rndPos);

        if (this._checkValid(_curPos, candPos, true)) {
          wp = new Waypoint(candPos.toVector());
          break;
        }
      }
    } else {
      wp = new Waypoint(this._target.pos.toVector());
    }
    wp.pause = this._pause;
    wp.nearestIsOk = true;

    return wp;
  }
}
