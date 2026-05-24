import * as navigation from "@gl/api/navigation";

import { type Vector2 } from "@gl/types/api/vector";
import type { Character } from "./character";
import { Delay } from "./delay";
import { Easings } from "./easing";
import { chance, inCircle, inRing, randFloat, randInt } from "./rand";
import { Vec2 } from "./vec2";
import { Waypoint } from "./waypoint";

const tryToFindValid: number = 10;

export abstract class NavPlan {
  public name: string = ""; // For debug logging

  public abstract getNextWaypoint(curPos: Vec2): Promise<Waypoint>;
  public hasNextWaypoint(_curPos: Vec2): boolean {
    return true;
  }

  public tick(_deltaMS: number, _curPos: Vec2): Promise<boolean> {
    return Promise.resolve(false);
  }

  protected async _checkValid(
    start: Vec2,
    end: Vec2,
    nearestIsOk: boolean,
    lengthBound: number = Number.POSITIVE_INFINITY as number,
  ): Promise<boolean> {
    const path = await navigation.findPath(
      "",
      start.toVector(),
      end.toVector(),
      nearestIsOk,
      lengthBound,
    );
    const hasPath = path.length > 0;
    return hasPath;
  }

  protected _pathLength(path: Vec2[]): number {
    let len: number = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i]!;
      const b = path[i + 1]!;
      len += a.distanceTo(b);
    }
    return len;
  }

  protected async _randomInCircle(
    curPos: Vec2,
    maxDistance: number,
  ): Promise<Waypoint> {
    let wp = Waypoint.null();

    for (let i = 0; i < tryToFindValid; i++) {
      const rndPos = inCircle(maxDistance);
      const candPos = curPos.added(rndPos);
      if (await this._checkValid(curPos, candPos, true, maxDistance)) {
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

  constructor(position: Vector2) {
    super();
    this._position = Vec2.fromVector(position);
  }

  static fromWaypoint(name: string): StationaryPlan {
    const wp = navigation.getWaypoint(name);
    return new StationaryPlan(wp.pos);
  }

  public async getNextWaypoint(_curPos: Vec2): Promise<Waypoint> {
    return new Waypoint(this._position.toVector());
  }

  public hasNextWaypoint(_curPos: Vec2): boolean {
    return false;
  }
}

export class RandomWalk extends NavPlan {
  private _maxDistance: number;
  private _minPause: number;
  private _maxPause: number;

  constructor(maxDistance: number, minPause: number, maxPause: number) {
    super();
    this._maxDistance = maxDistance;
    this._minPause = minPause;
    this._maxPause = maxPause;
  }

  public async getNextWaypoint(curPos: Vec2): Promise<Waypoint> {
    const wp = await this._randomInCircle(curPos, this._maxDistance);
    wp.pause = randFloat(this._minPause, this._maxPause);
    wp.nearestIsOk = true;
    return wp;
  }
}

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

  public override async getNextWaypoint(_curPos: Vec2): Promise<Waypoint> {
    const wp = this._waypoints[this.i]!;
    this.i = (this.i + 1) % this._waypoints.length;
    return wp;
  }
}

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

  public override async getNextWaypoint(_curPos: Vec2): Promise<Waypoint> {
    const useRandom = this._randomCounter < this._maxRandom;

    if (useRandom) {
      const wp = await this.randomWaypoint(_curPos);
      this._randomCounter++;
      return wp;
    }
    this._randomCounter = 0;
    return await super.getNextWaypoint(_curPos);
  }

  private async randomWaypoint(curPos: Vec2): Promise<Waypoint> {
    let wp = Waypoint.null();

    for (let i = 0; i < tryToFindValid; i++) {
      const rndPos = inCircle(this._maxDistance);
      const candPos = curPos.added(rndPos);
      if (await this._checkValid(curPos, candPos, true)) {
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
  private _minDistance: number = 0;
  private _maxDistance: number = 0;
  private _pause: number = 0;

  constructor(
    target: Character,
    minDistance: number = 0,
    maxDistance: number = 0,
    pause: number = 0,
  ) {
    super();
    this._target = target;
    this._minDistance = minDistance;
    this._maxDistance = maxDistance;
    this._pause = pause;
  }

  public async getNextWaypoint(_curPos: Vec2): Promise<Waypoint> {
    let wp: Waypoint = Waypoint.null();

    if (this._maxDistance > 0) {
      for (let i = 0; i < tryToFindValid; i++) {
        const rndPos = inRing(this._minDistance, this._maxDistance);
        const candPos = this._target.pos.added(rndPos);

        if (await this._checkValid(_curPos, candPos, true)) {
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

/**
 * Attacks when the target is near, otherwise uses a default waypoint. Good for
 * animals.
 */
abstract class AggressiveBasePlan extends NavPlan {
  private _target: Character;
  private _attackDistance: number;
  private _cooldown: Delay = new Delay(2000);
  private _attacking: boolean = false;

  constructor(target: Character, attackDistance: number) {
    super();
    this._target = target;
    this._attackDistance = attackDistance;
  }

  protected async _targetIsNear(pos: Vec2): Promise<boolean> {
    // Performance optimization
    const withinRad = this._normDistance(pos) < 1.0;
    if (withinRad) {
      return this._checkValid(
        pos,
        this._target.pos,
        true,
        this._attackDistance,
      );
    }
    return false;
  }

  // The distance to the target, normalized by the attack distance, so that 0 is
  // right next to the target and 1 is at the attack distance.
  protected _normDistance(pos: Vec2): number {
    return this._target.pos.distanceTo(pos) / this._attackDistance;
  }

  protected abstract _defaultWaypoint(curPos: Vec2): Promise<Waypoint>;

  protected _shouldAttack(_curPos: Vec2): boolean {
    return true;
  }

  public async getNextWaypoint(curPos: Vec2): Promise<Waypoint> {
    if (
      (await this._targetIsNear(curPos)) &&
      this._shouldAttack(curPos) &&
      !this._attacking
    ) {
      const nd = this._normDistance(curPos);
      const wp = new Waypoint(this._target.pos.toVector());
      wp.pause = nd * 1000 + 100;
      wp.nearestIsOk = true;
      this._attacking = true;
      return wp;
    }
    this._attacking = false;
    return this._defaultWaypoint(curPos);
  }

  public override async tick(deltaMS: number, curPos: Vec2): Promise<boolean> {
    if (!this._attacking && this._cooldown.tick(deltaMS)) {
      if (await this._targetIsNear(curPos)) {
        // As we get closer to the target, less cooldown
        const checkTime = this._normDistance(curPos) * 1900 + 200;
        this._cooldown.timeMs = checkTime;
        return true;
      }
    }
    return false;
  }
}

export class RandomThenAttackPlan extends AggressiveBasePlan {
  private _randMoveDistance: number;

  constructor(
    target: Character,
    attackDistance: number,
    randMoveDistance: number,
  ) {
    super(target, attackDistance);
    this._randMoveDistance = randMoveDistance;
  }
  // Gives the player a chance to escape, if we're right on top of them,
  // there's a high chance that we'll choose a default waypoint instead.
  protected _shouldAttack(curPos: Vec2): boolean {
    const nd = this._normDistance(curPos);
    return chance(Easings.easeOutCircle(nd));
  }

  protected override async _defaultWaypoint(curPos: Vec2): Promise<Waypoint> {
    const wp = this._randomInCircle(curPos, this._randMoveDistance);
    return wp;
  }
}

export class DefaultThenAttackPlan extends AggressiveBasePlan {
  private _default: NavPlan;

  constructor(defaultPlan: NavPlan, target: Character, attackDistance: number) {
    super(target, attackDistance);
    this._default = defaultPlan;
  }

  protected override async _defaultWaypoint(curPos: Vec2): Promise<Waypoint> {
    const wp = await this._default.getNextWaypoint(curPos);
    wp.nearestIsOk = true;
    return wp;
  }
}
