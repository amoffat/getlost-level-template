import * as host from "../../api/w2h/host";
import { Vec2 } from "../la/vec2";

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

/*
 * Handles player movement in a top-down 2D environment.
 */
export class PlayerMovement {
  private _pos: Vec2;
  private _velocity: Vec2;
  public direction: Vec2;
  private impulse: Vec2;
  private mass: f32;
  private maxVelocity: Vec2;
  private _action: PlayerAction = PlayerAction.Idle;

  constructor(initialPos: Vec2, impulse: Vec2, maxVelocity: Vec2, mass: f32) {
    this._pos = initialPos;
    this._velocity = new Vec2(0.0, 0.0);
    this.direction = new Vec2(0.0, 0.0);
    this.impulse = impulse;
    this.maxVelocity = maxVelocity;
    this.mass = mass;
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

  // Update method to handle position updates per frame
  tick(deltaMS: f32): void {
    const props = host.map.getTileProps(this._pos.x, this._pos.y);
    const adjImpulse = this.impulse.scaled(props.traction);

    const movementVector = this.direction; //.mul(this.impulse);

    if (movementVector.x != 0 || movementVector.y != 0) {
      const direction: Vec2 = movementVector;

      // Apply impulse to velocity based on mass
      this._velocity.x += (direction.x * adjImpulse.x) / this.mass;
      this._velocity.y += (direction.y * adjImpulse.y) / this.mass;

      // Don't go faster than max velocity
      this._velocity.cap(this.maxVelocity);

      // Apply friction to velocity
      this._velocity.x *= 1 - props.friction;
      this._velocity.y *= 1 - props.friction;

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
      this._velocity.x *= 1 - props.friction;
      this._velocity.y *= 1 - props.friction;

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
  }
}
