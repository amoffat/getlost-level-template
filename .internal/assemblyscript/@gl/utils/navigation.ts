import { Vector } from "../api/types/vector";
import * as host from "../api/w2h/host";
import { Character } from "./character";
import { Delay } from "./delay";
import { easeOutCircle } from "./easing";
import { Vec2 } from "./la/vec2";
import { chance, float, inCircle, inRing, int } from "./rand";
import { Waypoint } from "./waypoint";

const tryToFindValid: i32 = 10;

export abstract class NavPlan {
  public name: string = ""; // For debug logging

  public abstract getNextWaypoint(curPos: Vec2): Waypoint;
  public hasNextWaypoint(_curPos: Vec2): bool {
    return true;
  }

  public tick(_deltaMS: f32, _curPos: Vec2): bool {
    return false;
  }

  protected _checkValid(
    start: Vec2,
    end: Vec2,
    nearestIsOk: bool,
    lengthBound: f32 = Infinity
  ): bool {
    const path = host.navigation.findPath(
      "",
      start.toVector(),
      end.toVector(),
      nearestIsOk,
      lengthBound
    );
    const hasPath = path.length > 0;
    return hasPath;
  }

  protected _pathLength(path: Vec2[]): f32 {
    let len: f32 = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i];
      const b = path[i + 1];
      len += a.distanceTo(b);
    }
    return len;
  }

  protected _randomInCircle(curPos: Vec2, maxDistance: f32): Waypoint {
    let wp = Waypoint.null();

    for (let i = 0; i < tryToFindValid; i++) {
      const rndPos = inCircle(maxDistance);
      const candPos = curPos.added(rndPos);
      if (this._checkValid(curPos, candPos, true, maxDistance)) {
        wp = new Waypoint(candPos.toVector());
        break;
      }
    }
    wp.nearestIsOk = true;
    return wp;
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
  private _minPause: f32;
  private _maxPause: f32;

  constructor(maxDistance: f32, minPause: f32, maxPause: f32) {
    super();
    this._maxDistance = maxDistance;
    this._minPause = minPause;
    this._maxPause = maxPause;
  }

  public getNextWaypoint(curPos: Vec2): Waypoint {
    const wp = this._randomInCircle(curPos, this._maxDistance);
    wp.pause = float(this._minPause, this._maxPause);
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
    let wp = Waypoint.null();

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
    let wp: Waypoint = Waypoint.null();

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

export class AttackPlan extends NavPlan {
  private _target: Character;
  private _attackDistance: f32;
  private _randMoveDistance: f32;

  private _cooldown: Delay = new Delay(2000);

  constructor(target: Character, randMoveDistance: f32, attackDistance: f32) {
    super();
    this._target = target;
    this._attackDistance = attackDistance;
    this._randMoveDistance = randMoveDistance;
  }

  private _targetIsNear(pos: Vec2): bool {
    // Performance optimization
    const withinRad = this._normDistance(pos) < 1.0;
    if (withinRad) {
      return this._checkValid(
        pos,
        this._target.pos,
        true,
        this._attackDistance
      );
    }
    return false;
  }

  // The distance to the target, normalized by the attack distance, so that 0 is
  // right next to the target and 1 is at the attack distance.
  private _normDistance(pos: Vec2): f32 {
    return this._target.pos.distanceTo(pos) / this._attackDistance;
  }

  protected _defaultWaypoint(curPos: Vec2): Waypoint {
    const wp = this._randomInCircle(curPos, this._randMoveDistance);
    return wp;
  }

  public getNextWaypoint(curPos: Vec2): Waypoint {
    if (this._targetIsNear(curPos)) {
      const nd = this._normDistance(curPos);
      // Gives the player a chance to escape, if we're right on top of them,
      // there's a high chance that we'll choose a default waypoint instead.
      if (chance(easeOutCircle(nd))) {
        const wp = new Waypoint(this._target.pos.toVector());
        wp.pause = nd * 1000 + 100;
        wp.nearestIsOk = true;
        return wp;
      }
    }
    return this._defaultWaypoint(curPos);
  }

  public tick(deltaMS: f32, curPos: Vec2): bool {
    if (this._cooldown.tick(deltaMS)) {
      if (this._targetIsNear(curPos)) {
        // As we get closer to the target, less cooldown
        const checkTime = this._normDistance(curPos) * 1900 + 200;
        this._cooldown.timeMs = checkTime;
        return true;
      }
    }
    return false;
  }
}

export class RandomThenAttackPlan extends AttackPlan {
  protected _defaultWaypoint(curPos: Vec2): Waypoint {
    const wp = new Waypoint(curPos);
    wp.nearestIsOk = true;
    return wp;
  }
}
