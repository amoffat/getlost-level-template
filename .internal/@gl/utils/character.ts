import * as char from "@gl/api/char";
import { hurt } from "@gl/behaviors/hurt";
import { globalTicker } from "@gl/ticker";
import { CharAction } from "@gl/types/character";

import { type WavyParams } from "@gl/actions/WavyAction";
import { jump } from "@gl/behaviors/jump";
import { type Vector2 } from "@gl/types/api/vector";
import { Behavior } from "./behavior";
import { Delay } from "./delay";
import { MovementManager } from "./movement";
import { Vec2 } from "./vec2";

// Gravitational acceleration used when a character is falling (pixels per
// second squared).
export const fallingGravity = 500;

export enum Direction {
  North,
  South,
  East,
  West,
}

export const chars: Map<string, Character> = new Map();
const baseMoveForce: number = 10000;

export class Character {
  private _pos: Vec2 = new Vec2(0, 0);
  private _velocity: Vec2 = new Vec2(0, 0);
  private _controlDirection: Vec2 = new Vec2(0, 0);
  public speed: number = 1.0;
  private _moveForce: Vec2 = Vec2.fromVal(baseMoveForce);
  public mass: number = 40;
  public maxVelocity: Vec2 = Vec2.fromMagnitude(100);
  private _action: CharAction = CharAction.Idle;
  public id: string;
  private _isPlayer: boolean = false;

  private _falling: boolean = false;
  private _fallingVelocity: number = 0;
  private _activeJump: Behavior<Character> | null = null;

  // When an action is set, it can persist, overriding walk action changes.
  private _persistAction: Delay = new Delay(0);

  public movement: MovementManager;
  private _lookAtFn: (() => Vec2) | null = null;
  private _lookAtWhileMoving: boolean = false;
  private _standingDir: Vec2 = new Vec2(0, 1);

  /** The desired speed of the character's animation */
  private _speed: number = 1.0;

  // Set via __internal__init
  public tags: Set<string> = new Set();

  constructor(id: string) {
    this.id = id;
    const initialPos = Vec2.fromVector2(char.getPos(id));
    this._pos = initialPos.clone();
    this._isPlayer = this.id == "player";
    chars.set(id, this);

    this.movement = new MovementManager(id, () => this._pos);
    this.movement.onTargetCleared = () => {
      this._velocity = new Vec2(0, 0);
      this._controlDirection = new Vec2(0, 0);
    };

    globalTicker.subscribe((deltaMs) => {
      this.tick(deltaMs);
    });
  }

  static get(id: string): Character | undefined {
    if (!chars.has(id)) {
      console.error(`No character with id ${id}`);
    }
    return chars.get(id);
  }

  /**
   * Do not call directly. The engine calls this.
   * @param deltaMS
   */
  public static tickAll(deltaMS: number): void {
    chars.forEach((char) => {
      char.tick(deltaMS);
    });
  }

  public getPos(): Vec2 {
    return this._pos;
  }

  public setPos(newPos: Vec2): void {
    this._pos = newPos;
  }

  public setControlDirection(dir: Vec2): void {
    this._controlDirection = dir;
  }

  public setStandingDir(dir: Vec2): void {
    this._standingDir = dir;
  }

  public getVelocity(): Vec2 {
    return this._velocity;
  }

  public setVelocity(v: Vector2): void {
    this._velocity = Vec2.fromVector2(v);
  }

  public addImpulse(impulse: Vec2): void {
    this._velocity.add({ x: impulse.x / this.mass, y: impulse.y / this.mass });
  }

  public setColorOverlay(color: number, alpha: number): void {
    char.setColorOverlay({ id: this.id, color, alpha });
  }

  public getAlpha(): number {
    return char.getAlpha(this.id);
  }

  public setAlpha(alpha: number): void {
    char.setAlpha({ id: this.id, alpha });
  }

  public getScale(): number {
    return char.getScale(this.id);
  }

  public setScale(size: number): void {
    char.setScale(this.id, size);
  }

  public setRotation(radians: number): void {
    char.setRotation(this.id, radians);
  }

  public getZ(): number {
    return char.getZIndex(this.id);
  }

  public setZ(z: number): void {
    char.setZIndex(this.id, z);
  }

  public setWavy(params: Partial<WavyParams>): void {
    char.setWavy(this.id, params);
  }

  public getAction(): CharAction {
    return this._action;
  }

  public setAction(newAction: CharAction, duration: number = -1): void {
    if (this._action === newAction) return;
    if (!this._persistAction.done) return;

    this._action = newAction;
    this._persistAction = new Delay(duration);
    char.setAction(this.id, this._action);
  }

  set collisions(enabled: boolean) {
    char.makeCollidable(this.id, enabled);
  }

  public setMoveSound(
    sound: string,
    volume: number = 1.0,
    onlyWhileMoving: boolean = false,
  ): void {
    char.setMoveSound({ id: this.id, sound, volume, onlyWhileMoving });
  }

  public set visibility(enabled: boolean) {
    char.toggle(this.id, enabled);
  }

  public lookAt(
    args: { fn: (() => Vec2) | null; whileMoving?: boolean } | null,
  ): void {
    if (args === null) {
      this._lookAtFn = null;
      this._lookAtWhileMoving = false;
    } else {
      this._lookAtFn = args.fn;
      this._lookAtWhileMoving = args.whileMoving ?? false;
    }
  }

  protected getMoveAction(dir: Vec2): CharAction {
    // Choose the walk action based on the direction of movement, considering
    // that this is a 2.5D game, so up and down are not as pronounced.
    if (Math.abs(dir.x) > Math.abs(dir.y * 0.5)) {
      return dir.x < 0 ? CharAction.WalkLeft : CharAction.WalkRight;
    } else {
      return dir.y < 0 ? CharAction.WalkUp : CharAction.WalkDown;
    }
  }

  protected getStandAction(dir: Vec2): CharAction {
    if (Math.abs(dir.x) > Math.abs(dir.y)) {
      return dir.x < 0 ? CharAction.StandLeft : CharAction.StandRight;
    } else {
      return dir.y < 0 ? CharAction.StandUp : CharAction.StandDown;
    }
  }

  /**
   * Do not call directly. The engine calls this.
   * @param deltaMs
   * @returns
   */
  public async tick(deltaMs: number): Promise<void> {
    const dtSec: number = deltaMs / 1000;
    this._persistAction.tick(deltaMs);

    if (this._falling) {
      this._pos.x += this._velocity.x * dtSec;
      this._fallingVelocity += fallingGravity * dtSec;
      this._pos.y = this._pos.y + this._fallingVelocity * dtSec;
      char.setPos(this.id, this._pos.x, this._pos.y);
      return;
    }

    const movementResult = await this.movement.tick(deltaMs, this._pos);

    const props = char.getMoveProps(this.id);
    if (!this._isPlayer) {
      this._controlDirection = new Vec2(0, 0);
    }

    const moveDir = movementResult?.direction ?? this._controlDirection;
    const navSpeed = movementResult?.navSpeed ?? 1.0;
    const easingSpeed = movementResult?.easingSpeed ?? 1.0;

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

    // The reasoning here is that a NPC will only move to valid positions via
    // pathfinding, so no collision detection is needed. Collision detection is
    // disabled anyways while they're moving.
    const needsCollisionCheck = this._isPlayer;

    let moveAction: CharAction = this._action;
    if (moveDir.x != 0 || moveDir.y != 0) {
      // Low traction means our impulse is less effective
      const adjForce = this._moveForce
        // Character's innate speed * waypoint speed * waypoint easing
        .scaled(this.speed * navSpeed * easingSpeed)
        .scaled(traction)
        .scaled(dtSec);

      // Apply impulse to velocity based on mass
      this._velocity.x += (moveDir.x * adjForce.x) / this.mass;
      this._velocity.y += (moveDir.y * adjForce.y) / this.mass;

      // Don't go faster than max velocity
      this._velocity.cap(this.maxVelocity);

      // Apply friction
      this._velocity.x *= frictionFactor;
      this._velocity.y *= frictionFactor;

      // Where would we ideally end up if no collisions?
      const proposedTrans = this._velocity.scaled(dtSec);

      // Check for collisions and adjust proposed translation
      if (needsCollisionCheck) {
        const correctedTrans = char.checkCollision({
          id: this.id,
          pos: this._pos,
          translation: proposedTrans,
        });
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
        const correctedTrans = char.checkCollision({
          id: this.id,
          pos: this._pos,
          translation: proposedTrans,
        });
        // Update position
        this._pos.x += correctedTrans.x;
        this._pos.y += correctedTrans.y;
      } else {
        // Update position
        this._pos.x += proposedTrans.x;
        this._pos.y += proposedTrans.y;
      }

      moveAction = this.getStandAction(this._standingDir);
    }

    // If a look-at target is set, override the facing direction based on the
    // whileMoving option. When false (default), lookAt only applies while the
    // character is standing still; when true it also applies while moving.
    if (this._lookAtFn !== null) {
      const target = this._lookAtFn();
      const dir = target.subbed(this._pos);
      if (!dir.isZero) {
        const isMoving = moveDir.x != 0 || moveDir.y != 0;
        if (this._lookAtWhileMoving || !isMoving) {
          moveAction = isMoving
            ? this.getMoveAction(dir)
            : this.getStandAction(dir);
        }
      }
    }

    // Slow down our animation speed based on our speed relative to our max speed.
    const animSpeed = Math.min(
      1.0,
      Math.max(0.4, this._velocity.magnitude / 35),
    );
    const authoritativeSpeed = this._speed * animSpeed;
    char.setSpeed(this.id, authoritativeSpeed);
    char.setPos(this.id, this._pos.x, this._pos.y);
    this.setAction(moveAction);
  }

  public setSpeed(speed: number): void {
    this._speed = speed;
  }

  public getSpeed(): number {
    return this._speed;
  }

  public hurt(dir: Vec2) {
    const behavior = hurt(this, { dir });
    behavior.perform();
  }

  public jump({
    distance = 32,
  }: { distance?: number } = {}): Behavior<Character> {
    const jumpDir = this.getVelocity()
      .normalized()
      .scale(distance)
      .multiply({ x: 1, y: 0.8 }); // Account for 2.5D perspective
    const behavior = jump(this, jumpDir);
    this._activeJump = behavior;
    behavior.onBehaviorEnd(() => {
      if (this._activeJump === behavior) {
        this._activeJump = null;
      }
    });
    behavior.perform();
    return behavior;
  }

  public setHeight(height: number): void {
    char.setHeight(this.id, height);
  }

  public getHeight(): number {
    return char.getHeight(this.id);
  }

  public getFalling(): boolean {
    return this._falling;
  }

  public setFalling({
    enabled,
    startVelocity = 0,
  }: {
    enabled: boolean;
    startVelocity?: number;
  }): void {
    // Cancel any in-progress jump so it stops overriding _pos and _velocity.
    // Without this, JumpAction continues calling setPos() on every tick after
    // falling starts, causing _pos to be reset to the linear-interpolation
    // endpoint each frame — which diverges from the falling-physics position
    // and produces a visible snap/bump when the jump animation finishes.
    if (enabled && this._activeJump) {
      this._activeJump.cancel();
      this._activeJump = null;
    }
    this._falling = enabled;
    this._fallingVelocity = startVelocity;
    char.setShadow(this.id, false);
  }
}

/**
 * Called by the engine only to move a character to a location in response to a
 * milestone state change.
 * @private
 */
export function setCharacterTargetPos({
  charId,
  pos,
  speed = 1.0,
}: {
  charId: string;
  pos: Vector2;
  speed?: number;
}): void {
  console.log({ dev: true, charId, pos }, `Setting target position`);
  const c = chars.get(charId);
  c?.movement.setTargetPos({ targetPos: pos, speed });
}
