import { Vector } from "../../api/types/vector";
import * as host from "../../api/w2h/host";
import { Vec2 } from "../la/vec2";
import { deriveTargetIndex, TrackResult } from "../paths";

export enum Direction {
  North,
  South,
  East,
  West,
}

export enum PlayerAction {
  Idle,
  WalkRight,
  WalkLeft,
  WalkUp,
  WalkDown,
}

const stuckTRate: f32 = 2; // T units per second
const stuckTimeout: f32 = 1000; // ms

/*
 * Handles player movement in a top-down 2D environment.
 */
export class PlayerMovement {
  private _pos: Vec2;
  private _velocity: Vec2;
  public direction: Vec2;
  private moveForce: Vec2;
  public mass: f32;
  public maxVelocity: Vec2;
  private _action: PlayerAction = PlayerAction.Idle;
  public name: string;

  private _targetPos: Vec2 = new Vec2(0, 0);
  private _targetPath: Vec2[] = [];
  private _stuckTimer: f32 = 0;
  private _lastTrackResult: TrackResult = { index: -1, distance: 0, t: 0 };

  constructor(initialPos: Vec2, impulse: Vec2, maxVelocity: Vec2, mass: f32) {
    this._pos = initialPos;
    this._velocity = new Vec2(0.0, 0.0);
    this.direction = new Vec2(0.0, 0.0);
    this.moveForce = impulse;
    this.maxVelocity = maxVelocity;
    this.mass = mass;
    this.name = "player";
  }

  // Get the player's current position. This is used in our game loop tick.
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

  get action(): PlayerAction {
    return this._action;
  }

  get isMoving(): bool {
    return this._action != PlayerAction.Idle;
  }

  setTargetPos(targetPos: Vector): void {
    this.clearTarget();
    this._targetPos = Vec2.fromVector(targetPos);
    this._targetPath = host.char
      .findPath(this.name, this._pos.toVector(), targetPos)
      .map<Vec2>((v) => Vec2.fromVector(v));
  }

  clearTarget(): void {
    this._targetPath = [];
    this._targetPos = new Vec2(0, 0);
    this._lastTrackResult = { index: -1, distance: 0, t: 0 };
    this._stuckTimer = 0;
    host.char.clearPath(this.name);
  }

  // Update method to handle position updates per frame
  tick(deltaMS: f32): void {
    const props = host.char.getMoveProps(this.name);

    if (this._targetPath.length > 0) {
      const trackResult = deriveTargetIndex(this._pos, this._targetPath);
      const goalDist = this._pos.distanceTo(this._targetPos);

      const oldTrackResult = this._lastTrackResult;
      this._lastTrackResult = trackResult;
      const maybeStuck =
        this._lastTrackResult.index == oldTrackResult.index &&
        Mathf.abs(oldTrackResult.t - trackResult.t) <
          (stuckTRate * deltaMS) / 1000;

      if (maybeStuck) {
        if (this._stuckTimer > stuckTimeout) {
          this.setTargetPos(this._targetPos.toVector());
          return;
        } else {
          this._stuckTimer += deltaMS;
        }
      } else {
        this._stuckTimer = 0;
      }

      if (goalDist < 1) {
        this.clearTarget();
      } else if (trackResult.distance > 32) {
        this.setTargetPos(this._targetPos.toVector());
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

    const movementVector = this.direction; //.mul(this.impulse);

    if (movementVector.x != 0 || movementVector.y != 0) {
      // Low traction means our impulse is less effective
      const adjForce = this.moveForce.scaled(traction).scaled(deltaMS / 1000);
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
      const correctedTrans = host.physics.checkCollision(
        this._pos.x,
        this._pos.y,
        proposedTrans.x,
        proposedTrans.y
      );

      // Update position
      this._pos.x += correctedTrans[0];
      this._pos.y += correctedTrans[1];

      // Our character is primarily a left-right kind of guy, so we'll base the
      // action on the x velocity.
      this._action =
        this._velocity.x < 0 ? PlayerAction.WalkLeft : PlayerAction.WalkRight;
      // if (abs(this._velocity.x) > abs(this._velocity.y)) {
      //   this._action =
      //     this._velocity.x < 0 ? PlayerAction.WalkLeft : PlayerAction.WalkRight;
      // } else {
      //   this._action =
      //     this._velocity.y < 0 ? PlayerAction.WalkUp : PlayerAction.WalkDown;
      // }
    } else {
      // Only apply friction when idle to slow down gradually
      this._velocity.x *= 1 - friction;
      this._velocity.y *= 1 - friction;

      // Don't allow infinitely small velocities (which affect walk sound)
      this._velocity.truncate(0.001);

      const proposedTrans = this._velocity.scaled(deltaMS / 1000);
      const correctedTrans = host.physics.checkCollision(
        this._pos.x,
        this._pos.y,
        proposedTrans.x,
        proposedTrans.y
      );

      this._pos.x += correctedTrans[0];
      this._pos.y += correctedTrans[1];

      this._action = PlayerAction.Idle;
    }

    // Slow down our animation speed based on our speed relative to our max speed.
    const animSpeed = Math.min(
      1.0,
      Math.max(0.4, this._velocity.magnitude / 35)
    ) as f32;
    host.player.setSpeed(animSpeed);
  }
}
