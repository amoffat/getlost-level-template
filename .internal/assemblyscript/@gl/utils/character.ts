import * as host from "../api/w2h/host";
import { Delay } from "./delay";
import * as easing from "./easing";
import { Vec2 } from "./la/vec2";
import { NavPlan, StationaryPlan } from "./navigation";
import { deriveTargetIndex, TrackResult } from "./paths";
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

@lazy
const all: Map<string, Character> = new Map();
const stuckTRate: f32 = 0.1; // T units per second
const stuckTimeout: f32 = 2000; // ms
const baseMoveForce: f32 = 10000;

enum NavState {
  stopped,
  moving,
  waiting,
}

export class Character {
  private _pos: Vec2 = new Vec2(0, 0);
  private _velocity: Vec2 = new Vec2(0, 0);
  public direction: Vec2 = new Vec2(0, 0);
  public speed: f32 = 1.0;
  private _navSpeed: f32 = 1.0;
  private _state: NavState = NavState.stopped;
  private _moveForce: Vec2 = Vec2.fromVal(baseMoveForce);
  public mass: f32 = 50;
  public maxVelocity: Vec2 = Vec2.fromMagnitude(100);
  private _action: CharAction = CharAction.Idle;
  public name: string;
  private _isPlayer: bool = false;
  private _visible: bool = true;

  private _navPlan: NavPlan;

  private _sourcePos: Vec2 = new Vec2(0, 0);
  private _targetPos: Vec2 = new Vec2(0, 0);
  private _targetPath: Vec2[] = [];
  private _targetPathLen: f32 = 0; // total length of the target path
  private _stuckTimer: f32 = 0;
  private _lastTrackResult: TrackResult = { index: -1, distance: 0, t: 0 };
  private _waypointPause: Delay = new Delay(1000, 0, true);
  public startWalkMomentum: f32 = 5;
  public endWalkMomentum: f32 = 15;

  // When an action is set, it can persist, overriding walk action changes.
  private _persistAction: Delay = new Delay(0);

  constructor(name: string) {
    this.name = name;
    const initialPos = host.char.getPos(name);
    this._navPlan = new StationaryPlan(initialPos);
    this._pos = Vec2.fromVector(initialPos);
    this._sourcePos = this._pos;
    this._isPlayer = this.name == "player";
    all.set(name, this);
    this.speed = this._isPlayer ? 1.0 : 0.8;
  }

  static initAll(): void {
    const names = host.char.getAll();
    for (let i = 0; i < names.length; i++) {
      new Character(names[i]);
    }
  }

  static get(name: string): Character {
    return all.get(name);
  }

  static tickAll(deltaMS: f32): void {
    const chars = all.values();
    for (let i = 0; i < chars.length; i++) {
      chars[i].tick(deltaMS);
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

  public setAction(newAction: CharAction, time: f32 = -1): void {
    if (this._action === newAction) return;
    if (!this._persistAction.done) return;

    this._action = newAction;
    this._persistAction = new Delay(time);
    host.char.setAction(this.name, this._action);
  }

  set collisions(enabled: bool) {
    host.char.makeCollidable(this.name, enabled);
  }

  setNavPlan(navPlan: NavPlan): void {
    this._navPlan = navPlan;
    this.state = NavState.waiting;
    const wp = navPlan.getNextWaypoint(this.pos);
    this._setNavWaypoint(wp);
  }

  private _setNavWaypoint(wp: Waypoint): void {
    if (!wp.isNull) {
      this.setTargetPos(wp.pos, wp.nearestIsOk);
      this._navSpeed = wp.speed;
    }
    this._waypointPause = new Delay(wp.pause, wp.pause, true);
  }

  onReachTarget(): void {
    this.clearTarget();
    if (this._navPlan.hasNextWaypoint(this.pos)) {
      this.state = NavState.waiting;
    } else {
      this.state = NavState.stopped;
    }
  }

  setTargetPos(targetPos: Vec2, nearestIsOk: bool = true): void {
    this.clearTarget();

    this._targetPath = host.navigation
      .findPath(
        this.name,
        this._pos.toVector(),
        targetPos.toVector(),
        nearestIsOk,
        Infinity
      )
      .map<Vec2>((v) => Vec2.fromVector(v));
    this._targetPathLen = this._pathProgress();

    // Even if `nearestIsOk` is true, it's still possible not to find a path, if
    // your start and end are two separate "islands" of nodes.
    if (this._targetPath.length > 0) {
      this._sourcePos = this._pos;
      this._targetPos = targetPos;

      this.collisions = false;
      this.state = NavState.moving;
    }
  }

  public setMoveSound(
    sound: string,
    volume: f32 = 1.0,
    onlyWhileMoving: bool = false
  ): void {
    host.char.setMoveSound(this.name, sound, volume, onlyWhileMoving);
  }

  private set state(state: NavState) {
    this._state = state;
  }

  public set visibility(enabled: bool) {
    host.char.toggle(this.name, enabled);
    this._visible = enabled;
    host.navigation.clearPath(this.name);
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
  private _pathProgress(end: i32 = -1, t: f32 = -1): f32 {
    let len: f32 = 0;
    const endIdx = end < 0 ? this._targetPath.length - 1 : end;
    for (let i = 0; i < endIdx; i++) {
      const lastIteration = i === endIdx - 1;
      const a = this._targetPath[i];
      const b = this._targetPath[i + 1];
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
    this._state = NavState.stopped;
    this._targetPath = [];
    this._targetPos = new Vec2(0, 0);
    this._lastTrackResult = { index: -1, distance: 0, t: 0 };
    this._stuckTimer = 0;
    this._velocity = new Vec2(0, 0);
    this.direction = new Vec2(0, 0);
    this.collisions = true;
    host.navigation.clearPath(this.name); // clears the debug line
  }

  protected getMoveAction(velocity: Vec2): CharAction {
    // Choose the walk action based on the direction of movement, considering
    // that this is a 2.5D game, so up and down are not as pronounced.
    if (abs(velocity.x) > abs(velocity.y * 0.5)) {
      return velocity.x < 0 ? CharAction.WalkLeft : CharAction.WalkRight;
    } else {
      return velocity.y < 0 ? CharAction.WalkUp : CharAction.WalkDown;
    }
  }

  // Update method to handle position updates per frame
  tick(deltaMS: f32): void {
    if (!this._visible) return;

    const dtSec: f32 = deltaMS / 1000;
    this._persistAction.tick(deltaMS);

    if (this._state === NavState.waiting) {
      if (this._waypointPause.tick(deltaMS)) {
        const wp = this._navPlan.getNextWaypoint(this.pos);
        this._setNavWaypoint(wp);
      }
    } else {
      const needsNewWaypoint = this._navPlan.tick(deltaMS, this.pos);
      if (needsNewWaypoint) {
        const wp = this._navPlan.getNextWaypoint(this.pos);
        this._setNavWaypoint(wp);
      }
    }

    const props = host.char.getMoveProps(this.name);
    if (!this._isPlayer) {
      this.direction = new Vec2(0, 0);
    }

    let easingSpeed = <f32>1.0;

    if (this._targetPath.length > 0) {
      const trackResult = deriveTargetIndex(this._pos, this._targetPath);
      const adjustedGoal = this._targetPath[this._targetPath.length - 1];
      const goalDist = this._pos.distanceTo(adjustedGoal);

      const oldTrackResult = this._lastTrackResult;
      this._lastTrackResult = trackResult;
      const maybeStuck =
        this._lastTrackResult.index == oldTrackResult.index &&
        Mathf.abs(oldTrackResult.t - trackResult.t) <
          stuckTRate * dtSec;

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
        const targetNode = this._targetPath[trackResult.index];
        const adjust = targetNode.subbed(this._pos).capScalar(1);
        this.direction.add(adjust).normalize();

        const progress: f32 = this._pathProgress(
          trackResult.index,
          trackResult.t
        );
        easingSpeed = Mathf.max(
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

    // If we're in deep water, we want to decrease the friction and decrease the
    // traction, proportionally to the amount we're sunk. This lets us glide
    // more, like we're swimming.
    let friction = (props.friction *
      Math.max(1.0 - props.sink.amt / (42 * dtSec), 0.2)) as f32;
    let traction = (props.traction *
      Math.max(1.0 - props.sink.amt / (33 * dtSec), 0.03)) as f32;

    // If we're in shallow water, we want to increase friction and leave the
    // traction alone. This lets us slow down more, like we're wading.
    if (props.sink.amt < 0.4) {
      friction = props.friction + (0.3 * props.sink.amt) / 0.3;
      traction = props.traction;
    }

    let moveAction: CharAction = this._action;
    if (this.direction.x != 0 || this.direction.y != 0) {
      // Low traction means our impulse is less effective
      const adjForce = this._moveForce
        .scaled(this.speed * this._navSpeed * easingSpeed)
        .scaled(traction)
        .scaled(dtSec);

      // Apply impulse to velocity based on mass
      this._velocity.x += (this.direction.x * adjForce.x) / this.mass;
      this._velocity.y += (this.direction.y * adjForce.y) / this.mass;

      // Don't go faster than max velocity
      this._velocity.cap(this.maxVelocity);

      // Apply friction to velocity
      this._velocity.x *= 1 - friction;
      this._velocity.y *= 1 - friction;

      // Where would we ideally end up if no collisions?
      const proposedTrans = this._velocity.scaled(dtSec);

      // Check for collisions and adjust proposed translation
      if (needsCollisionCheck) {
        const correctedTrans = host.char.checkCollision(
          this.name,
          this._pos.x,
          this._pos.y,
          proposedTrans.x,
          proposedTrans.y
        );
        // Update position
        this._pos.x += correctedTrans[0];
        this._pos.y += correctedTrans[1];
      } else {
        // Update position
        this._pos.x += proposedTrans.x;
        this._pos.y += proposedTrans.y;
      }

      moveAction = this.getMoveAction(this._velocity);
    } else {
      // Only apply friction when idle to slow down gradually
      this._velocity.x *= 1 - friction;
      this._velocity.y *= 1 - friction;

      // Don't allow infinitely small velocities (which affect walk sound)
      this._velocity.truncate(0.001);

      const proposedTrans = this._velocity.scaled(dtSec);

      // Check for collisions and adjust proposed translation
      if (needsCollisionCheck) {
        const correctedTrans = host.char.checkCollision(
          this.name,
          this._pos.x,
          this._pos.y,
          proposedTrans.x,
          proposedTrans.y
        );
        // Update position
        this._pos.x += correctedTrans[0];
        this._pos.y += correctedTrans[1];
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
    ) as f32;
    host.char.setSpeed(this.name, animSpeed);
    host.char.setPos(this.name, this._pos.x, this._pos.y);
    this.setAction(moveAction);
  }
}
