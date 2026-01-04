import * as char from "../api/w2h/char";
import * as log from "../api/w2h/log";
import * as navigation from "../api/w2h/navigation";

import { Delay } from "./delay";
import * as easing from "./easing";
import { Vec2 } from "./la/vec2";
import { NavPlan, StationaryPlan } from "./navigation";
import { deriveTargetIndex, type TrackResult } from "./paths";
import { Waypoint } from "./waypoint";

export enum Direction {
  North,
  South,
  East,
  West,
}

export enum CharAction {
  Idle,
  WalkRight,
  WalkLeft,
  WalkUp,
  WalkDown,
  HurtLeft,
  HurtRight,
}

const all: Map<string, Character> = new Map();
const stuckTRate: number = 0.1; // T units per second
const stuckTimeout: number = 2000; // ms
const baseMoveForce: number = 10000;

enum NavState {
  stopped,
  moving,
  waiting,
}

export class Character {
  private _pos: Vec2 = new Vec2(0, 0);
  private _velocity: Vec2 = new Vec2(0, 0);
  public direction: Vec2 = new Vec2(0, 0);
  public speed: number = 0.8;
  private _navSpeed: number = 1.0;
  private _state: NavState = NavState.stopped;
  private _moveForce: Vec2 = Vec2.fromVal(baseMoveForce);
  public mass: number = 50;
  public maxVelocity: Vec2 = Vec2.fromMagnitude(100);
  private _action: CharAction = CharAction.Idle;
  public name: string;
  private _isPlayer: boolean = false;
  private _visible: boolean = true;

  private _navPlan: NavPlan;

  private _sourcePos: Vec2 = new Vec2(0, 0);
  private _targetPos: Vec2 = new Vec2(0, 0);
  private _targetPath: Vec2[] = [];
  private _targetPathLen: number = 0; // total length of the target path
  private _stuckTimer: number = 0;
  private _lastTrackResult: TrackResult = { index: -1, distance: 0, t: 0 };
  private _waypointPause: Delay = new Delay(1000, 0, true);
  public startWalkMomentum: number = 5;
  public endWalkMomentum: number = 15;

  // When an action is set, it can persist, overriding walk action changes.
  private _persistAction: Delay = new Delay(0);

  constructor(name: string) {
    this.name = name;
    const initialPos = char.getPos(name);
    this._navPlan = new StationaryPlan(initialPos);
    this._pos = Vec2.fromVector(initialPos);
    this._sourcePos = this._pos;
    this._isPlayer = this.name == "player";
    all.set(name, this);
  }

  static initAll(): void {
    const names = char.getAll();
    log.info(`Found characters: ${JSON.stringify(names)}`);
    // log.info(`Initializing characters: ${names.join(", ")}`);
    for (const name of names) {
      new Character(name);
    }
  }

  static get(name: string): Character {
    if (!all.has(name)) {
      log.error(`No character named ${name}`);
    }
    return all.get(name)!;
  }

  static async tickAll(deltaMS: number): Promise<void> {
    for (const char of all.values()) {
      await char.tick(deltaMS);
    }
  }

  // Get the character's current position. This is used in our game loop tick.
  public get pos(): Vec2 {
    return this._pos;
  }

  public set pos(newPos: Vec2) {
    this._pos = newPos.clone();
  }

  public get velocity(): Vec2 {
    return this._velocity;
  }

  public set velocity(v: Vec2) {
    this._velocity = v.clone();
  }

  public addImpulse(impulse: Vec2): void {
    this._velocity.add(impulse);
  }

  public get action(): CharAction {
    return this._action;
  }

  public setAction(newAction: CharAction, time: number = -1): void {
    if (this._action === newAction) return;
    if (!this._persistAction.done) return;

    this._action = newAction;
    this._persistAction = new Delay(time);
    char.setAction(this.name, this._action);
  }

  set collisions(enabled: boolean) {
    char.makeCollidable(this.name, enabled);
  }

  setNavPlan(navPlan: NavPlan, navImmediately: boolean = true): void {
    this._navPlan = navPlan;

    if (navImmediately) {
      this.state = NavState.waiting;
      navPlan.getNextWaypoint(this.pos).then((wp) => {
        this._setNavWaypoint(wp);
      });
    }
  }

  private _setNavWaypoint(wp: Waypoint): void {
    if (!wp.isNull) {
      const hasPath = this.setTargetPos(wp.pos, wp.nearestIsOk);
      this._navSpeed = wp.speed;
      if (!hasPath) {
        log.error(`Failed to find path to waypoint ${wp}`);
      }
      this._waypointPause = new Delay(wp.pause, wp.pause, true);
    }
  }

  onReachTarget(): void {
    this.clearTarget();
    if (this._navPlan.hasNextWaypoint(this.pos)) {
      this.state = NavState.waiting;
    } else {
      this.state = NavState.stopped;
    }
  }

  async setTargetPos(
    targetPos: Vec2,
    nearestIsOk: boolean = true
  ): Promise<boolean> {
    this.clearTarget();

    this._targetPath = (
      await navigation.findPath(
        this.name,
        this._pos.toVector(),
        targetPos.toVector(),
        nearestIsOk,
        Number.POSITIVE_INFINITY as number
      )
    ).map((v) => Vec2.fromVector(v));
    this._targetPathLen = this._pathProgress();

    // Even if `nearestIsOk` is true, it's still possible not to find a path, if
    // your start and end are two separate "islands" of nodes.
    if (this._targetPath.length > 0) {
      this._sourcePos = this._pos;
      this._targetPos = targetPos;

      this.collisions = false;
      this.state = NavState.moving;
    }

    return this._targetPath.length > 0;
  }

  public setMoveSound(
    sound: string,
    volume: number = 1.0,
    onlyWhileMoving: boolean = false
  ): void {
    char.setMoveSound(this.name, sound, volume, onlyWhileMoving);
  }

  private set state(state: NavState) {
    this._state = state;
  }

  public set visibility(enabled: boolean) {
    char.toggle(this.name, enabled);
    this._visible = enabled;
    navigation.clearPath(this.name);
  }

  /**
   * Calculates a path length of our navigation path. Used to calculate the full
   * length (no args) or a partial length (up to some index).
   *
   * @param end The end index to calculate up towards. Assumed the total length
   * of the path minus 1
   * @param t How far along the last segment we are.
   * @returns The progress along the path.
   */
  private _pathProgress(end: number = -1, t: number = -1): number {
    let len: number = 0;
    const endIdx = end < 0 ? this._targetPath.length - 1 : end;
    for (let i = 0; i < endIdx; i++) {
      const lastIteration = i === endIdx - 1;
      const a = this._targetPath[i]!;
      const b = this._targetPath[i + 1]!;
      if (lastIteration && t >= 0) {
        const segLen = b.subbed(a).magnitude * t;
        len += segLen;
      } else {
        len += a.distanceTo(b);
      }
    }
    return len;
  }

  clearTarget(): void {
    this.state = NavState.waiting;
    this._targetPath = [];
    this._targetPos = new Vec2(0, 0);
    this._lastTrackResult = { index: -1, distance: 0, t: 0 };
    this._stuckTimer = 0;
    this._velocity = new Vec2(0, 0);
    this.direction = new Vec2(0, 0);
    this.collisions = true;
    navigation.clearPath(this.name); // clears the debug line
  }

  protected getMoveAction(velocity: Vec2): CharAction {
    // Choose the walk action based on the direction of movement, considering
    // that this is a 2.5D game, so up and down are not as pronounced.
    if (Math.abs(velocity.x) > Math.abs(velocity.y * 0.5)) {
      return velocity.x < 0 ? CharAction.WalkLeft : CharAction.WalkRight;
    } else {
      return velocity.y < 0 ? CharAction.WalkUp : CharAction.WalkDown;
    }
  }

  // Update method to handle position updates per frame
  public async tick(deltaMS: number): Promise<void> {
    if (!this._visible) return;

    const dtSec: number = deltaMS / 1000;
    this._persistAction.tick(deltaMS);

    if (this._state === NavState.waiting) {
      if (this._waypointPause.tick(deltaMS)) {
        const wp = await this._navPlan.getNextWaypoint(this.pos);
        this._setNavWaypoint(wp);
      }
    } else {
      // This lets us interrupt our current nav plan. Useful if our plan is to
      // attack if the player is near, and we're moving randomly otherwise.
      const needsNewWaypoint = await this._navPlan.tick(deltaMS, this.pos);
      if (needsNewWaypoint) {
        const wp = await this._navPlan.getNextWaypoint(this.pos);
        this._setNavWaypoint(wp);
      }
    }

    const props = char.getMoveProps(this.name);
    if (!this._isPlayer) {
      this.direction = new Vec2(0, 0);
    }

    let easingSpeed = <number>1.0;

    let frictionHalflife: number = Math.max(0.0, props.friction);
    let traction: number = Math.max(0.0, Math.min(1.0, props.traction));

    if (props.sink.amt > 0) {
      // If we're in shallow water, we want to increase friction and leave the
      // traction alone. This lets us slow down more, like we're wading.
      if (props.sink.amt < 0.4) {
        frictionHalflife *= 0.5 * (1.0 - props.sink.amt);
      } else {
        frictionHalflife += 1 * props.sink.amt;
        traction = traction * Math.max((1.0 - props.sink.amt) * 0.2, 0.03);
      }
    }

    const frictionFactor: number = Math.pow(0.5, dtSec / frictionHalflife);

    if (this._targetPath.length > 0) {
      const trackResult = deriveTargetIndex(this._pos, this._targetPath);
      const adjustedGoal = this._targetPath.at(-1)!;
      const goalDist = this._pos.distanceTo(adjustedGoal);

      const oldTrackResult = this._lastTrackResult;
      this._lastTrackResult = trackResult;
      const maybeStuck =
        this._lastTrackResult.index == oldTrackResult.index &&
        Math.abs(oldTrackResult.t - trackResult.t) < stuckTRate * dtSec;

      if (maybeStuck) {
        // FIXME
        if (this._stuckTimer > stuckTimeout) {
          this.setTargetPos(this._targetPos);
          return;
        } else {
          this._stuckTimer += deltaMS;
        }
      } else {
        this._stuckTimer = 0;
      }

      // If we've reached our goal
      if (goalDist < 1) {
        this.onReachTarget();
      }
      // If we're too far away from our path, recalc our path
      else if (trackResult.distance > 32) {
        this.setTargetPos(this._targetPos);
      }
      // Happy path
      else {
        const targetNode = this._targetPath[trackResult.index]!;
        const adjust = targetNode.subbed(this._pos).capScalar(1);
        this.direction.add(adjust).normalize();

        const progress: number = this._pathProgress(
          trackResult.index,
          trackResult.t
        );
        easingSpeed = Math.max(
          easing.rampHoldRamp(
            this._targetPathLen,
            progress,
            this.startWalkMomentum,
            this.endWalkMomentum
          ),
          0.3
        );
      }
    }

    // The reasoning here is that a NPC will only move to valid positions via
    // pathfinding, so no collision detection is needed. Collision detection is
    // disabled anyways while they're moving.
    const needsCollisionCheck = this._isPlayer;

    let moveAction: CharAction = this._action;
    if (this.direction.x != 0 || this.direction.y != 0) {
      // Low traction means our impulse is less effective
      const adjForce = this._moveForce
        // Character's innate speed * waypoint speed * waypoint easing
        .scaled(this.speed * this._navSpeed * easingSpeed)
        .scaled(traction)
        .scaled(dtSec);

      // Apply impulse to velocity based on mass
      this._velocity.x += (this.direction.x * adjForce.x) / this.mass;
      this._velocity.y += (this.direction.y * adjForce.y) / this.mass;

      // Don't go faster than max velocity
      this._velocity.cap(this.maxVelocity);

      // Apply friction
      this._velocity.x *= frictionFactor;
      this._velocity.y *= frictionFactor;

      // Where would we ideally end up if no collisions?
      const proposedTrans = this._velocity.scaled(dtSec);

      // Check for collisions and adjust proposed translation
      if (needsCollisionCheck) {
        const correctedTrans = char.checkCollision(
          this.name,
          this._pos.x,
          this._pos.y,
          proposedTrans.x,
          proposedTrans.y
        );
        // Update position
        this._pos.x += correctedTrans.x;
        this._pos.y += correctedTrans.y;
      } else {
        // Update position
        this._pos.x += proposedTrans.x;
        this._pos.y += proposedTrans.y;
      }

      moveAction = this.getMoveAction(this._velocity);
    } else {
      // Only apply friction when idle to slow down gradually
      this._velocity.x *= frictionFactor;
      this._velocity.y *= frictionFactor;

      // Don't allow infinitely small velocities (which affect walk sound)
      this._velocity.truncate(0.001);

      const proposedTrans = this._velocity.scaled(dtSec);

      // Check for collisions and adjust proposed translation
      if (needsCollisionCheck) {
        const correctedTrans = char.checkCollision(
          this.name,
          this._pos.x,
          this._pos.y,
          proposedTrans.x,
          proposedTrans.y
        );
        // Update position
        this._pos.x += correctedTrans.x;
        this._pos.y += correctedTrans.y;
      } else {
        // Update position
        this._pos.x += proposedTrans.x;
        this._pos.y += proposedTrans.y;
      }

      moveAction = CharAction.Idle;
    }

    // Slow down our animation speed based on our speed relative to our max speed.
    const animSpeed = Math.min(
      1.0,
      Math.max(0.4, this._velocity.magnitude / 35)
    );
    char.setSpeed(this.name, animSpeed);
    char.setPos(this.name, this._pos.x, this._pos.y);
    this.setAction(moveAction);
  }
}
