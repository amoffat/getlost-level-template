import * as host from "../api/w2h/host";
import { Vec2 } from "./la/vec2";
import { NavPlan, StationaryPlan } from "./navigation";
import { deriveTargetIndex, TrackResult } from "./paths";
import { Periodic } from "./periodic";
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
}

@lazy
const all: Map<string, Character> = new Map();
const stuckTRate: f32 = 2; // T units per second
const stuckTimeout: f32 = 1000; // ms
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
  public maxVelocity: Vec2 = Vec2.fromMagnitude(35);
  private _action: CharAction = CharAction.Idle;
  public name: string;
  private _isPlayer: bool = false;

  private _navPlan: NavPlan;

  private _targetPos: Vec2 = new Vec2(0, 0);
  private _targetPath: Vec2[] = [];
  private _stuckTimer: f32 = 0;
  private _lastTrackResult: TrackResult = { index: -1, distance: 0, t: 0 };
  private _waypointPause: Periodic = new Periodic(0);

  constructor(name: string) {
    this.name = name;
    const initialPos = host.char.getPos(name);
    this._navPlan = new StationaryPlan(initialPos);
    this._pos = Vec2.fromVector(initialPos);
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
  get pos(): Vec2 {
    return this._pos;
  }

  set pos(newPos: Vec2) {
    this._pos = newPos.clone();
  }

  get velocity(): Vec2 {
    return this._velocity;
  }

  set velocity(v: Vec2) {
    this._velocity = v.clone();
  }

  get action(): CharAction {
    return this._action;
  }

  get isMoving(): bool {
    return this._action != CharAction.Idle;
  }

  set collisions(enabled: bool) {
    host.char.makeCollidable(this.name, enabled);
  }

  setNav(navPlan: NavPlan): void {
    this._navPlan = navPlan;
    const wp = navPlan.getNextWaypoint(this.pos);
    this._setNavWaypoint(wp);
  }

  private _setNavWaypoint(wp: Waypoint): void {
    this.setTargetPos(wp.pos);
    this._navSpeed = wp.speed;
    this._waypointPause = new Periodic(wp.pause, wp.pause);
  }

  onReachTarget(): void {
    this.clearTarget();
    if (this._navPlan.hasNextWaypoint(this.pos)) {
      this._state = NavState.waiting;
    } else {
      this._state = NavState.stopped;
    }
  }

  setTargetPos(targetPos: Vec2): void {
    this.clearTarget();
    this._targetPos = targetPos;
    this._targetPath = host.navigation
      .findPath(this.name, this._pos.toVector(), targetPos.toVector())
      .map<Vec2>((v) => Vec2.fromVector(v));
    this.collisions = false;
    this._state = NavState.moving;
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

  getAction(velocity: Vec2): CharAction {
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
    if (this._state === NavState.waiting) {
      if (this._waypointPause.tick(deltaMS)) {
        const wp = this._navPlan.getNextWaypoint(this.pos);
        this._setNavWaypoint(wp);
      }
    }

    const props = host.char.getMoveProps(this.name);
    if (!this._isPlayer) {
      this.direction = new Vec2(0, 0);
    }

    if (this._targetPath.length > 0) {
      const trackResult = deriveTargetIndex(this._pos, this._targetPath);
      const adjustedGoal = this._targetPath[this._targetPath.length - 1];
      const goalDist = this._pos.distanceTo(adjustedGoal);

      const oldTrackResult = this._lastTrackResult;
      this._lastTrackResult = trackResult;
      const maybeStuck =
        this._lastTrackResult.index == oldTrackResult.index &&
        Mathf.abs(oldTrackResult.t - trackResult.t) <
          (stuckTRate * deltaMS) / 1000;

      if (maybeStuck) {
        if (this._stuckTimer > stuckTimeout) {
          this.setTargetPos(this._targetPos);
          return;
        } else {
          this._stuckTimer += deltaMS;
        }
      } else {
        this._stuckTimer = 0;
      }

      if (goalDist < 1) {
        this.onReachTarget();
      } else if (trackResult.distance > 32) {
        this.setTargetPos(this._targetPos);
      } else {
        const targetNode = this._targetPath[trackResult.index];
        const adjust = targetNode.subbed(this._pos).capScalar(0.1);
        this.direction.add(adjust).normalize();
      }
    }

    // If we're in deep water, we want to decrease the friction and decrease the
    // traction, proportionally to the amount we're sunk. This lets us glide
    // more, like we're swimming.
    let friction = (props.friction *
      Math.max(1.0 - props.sink.amt / 0.7, 0.2)) as f32;
    let traction = (props.traction *
      Math.max(1.0 - props.sink.amt / 0.55, 0.03)) as f32;

    // If we're in shallow water, we want to increase friction and leave the
    // traction alone. This lets us slow down more, like we're wading.
    if (props.sink.amt < 0.4) {
      friction = props.friction + (0.3 * props.sink.amt) / 0.3;
      traction = props.traction;
    }

    const movementVector = this.direction;
    if (movementVector.x != 0 || movementVector.y != 0) {
      // Low traction means our impulse is less effective
      const adjForce = this._moveForce
        .scaled(this.speed * this._navSpeed)
        .scaled(traction)
        .scaled(deltaMS / 1000);
      const direction: Vec2 = movementVector;

      // Apply impulse to velocity based on mass
      this._velocity.x += (direction.x * adjForce.x) / this.mass;
      this._velocity.y += (direction.y * adjForce.y) / this.mass;

      // Don't go faster than max velocity
      this._velocity.cap(this.maxVelocity);

      // Apply friction to velocity
      this._velocity.x *= 1 - friction;
      this._velocity.y *= 1 - friction;

      // Where would we ideally end up if no collisions?
      const proposedTrans = this._velocity.scaled(deltaMS / 1000);

      // Check for collisions and adjust proposed translation
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

      this._action = this.getAction(this._velocity);
    } else {
      // Only apply friction when idle to slow down gradually
      this._velocity.x *= 1 - friction;
      this._velocity.y *= 1 - friction;

      // Don't allow infinitely small velocities (which affect walk sound)
      this._velocity.truncate(0.001);

      const proposedTrans = this._velocity.scaled(deltaMS / 1000);
      const correctedTrans = host.char.checkCollision(
        this.name,
        this._pos.x,
        this._pos.y,
        proposedTrans.x,
        proposedTrans.y
      );

      this._pos.x += correctedTrans[0];
      this._pos.y += correctedTrans[1];

      this._action = CharAction.Idle;
    }

    // Slow down our animation speed based on our speed relative to our max speed.
    const animSpeed = Math.min(
      1.0,
      Math.max(0.4, this._velocity.magnitude / 35)
    ) as f32;
    host.char.setSpeed(this.name, animSpeed);
    host.char.setPos(this.name, this._pos.x, this._pos.y);
    host.char.setAction(this.name, this._action);
  }
}
