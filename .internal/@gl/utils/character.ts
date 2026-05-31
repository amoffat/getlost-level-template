import * as char from "@gl/api/char";
import * as navigation from "@gl/api/navigation";
import { hurt } from "@gl/behaviors/hurt";
import { globalTicker } from "@gl/ticker";
import { CharAction } from "@gl/types/character";

import { WavyParams } from "@gl/actions/WavyAction";
import { jump } from "@gl/behaviors/jump";
import { Vector2 } from "@gl/types/api/vector";
import { Behavior } from "./behavior";
import { Delay } from "./delay";
import * as easing from "./easing";
import { NavPlan, StationaryPlan } from "./navigation";
import { deriveTargetIndex, type TrackResult } from "./paths";
import { Vec2 } from "./vec2";
import { Waypoint } from "./waypoint";

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
const stuckTRate: number = 0.1; // T units per second
const stuckTimeout: number = 2000; // ms
const baseMoveForce: number = 10000;

enum NavState {
  /** All movement stopped */
  stopped,
  /** Awaiting for a move command to be determined */
  pending,
  /** Processing a move command */
  moving,
  /** Waiting for the next move command */
  waiting,
}

export class Character {
  private _pos: Vec2 = new Vec2(0, 0);
  private _velocity: Vec2 = new Vec2(0, 0);
  public direction: Vec2 = new Vec2(0, 0);
  public speed: number = 1.0;
  private _navSpeed: number = 1.0;
  private _state: NavState = NavState.stopped;
  private _moveForce: Vec2 = Vec2.fromVal(baseMoveForce);
  public mass: number = 40;
  public maxVelocity: Vec2 = Vec2.fromMagnitude(100);
  private _action: CharAction = CharAction.Idle;
  public id: string;
  private _isPlayer: boolean = false;
  private _visible: boolean = true;

  private _falling: boolean = false;
  private _fallingVelocity: number = 0;
  private _activeJump: Behavior<Character> | null = null;

  private _navPlan: NavPlan;

  private _initialPos: Vec2 = new Vec2(0, 0);
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

  constructor(id: string) {
    this.id = id;
    this._initialPos = Vec2.fromVector2(char.getPos(id));
    this._navPlan = new StationaryPlan(this._initialPos);
    this._pos = Vec2.fromVector2(this._initialPos);
    this._isPlayer = this.id == "player";
    chars.set(id, this);

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

  public getVelocity(): Vec2 {
    return this._velocity;
  }

  public setVelocity(v: Vector2): void {
    this._velocity = Vec2.fromVector2(v);
  }

  public addImpulse(impulse: Vec2): void {
    this._velocity.add(impulse);
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

  public setWavy(params: Partial<WavyParams>): void {
    char.setWavy(this.id, params);
  }

  public get action(): CharAction {
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

  setNavPlan(navPlan: NavPlan, navImmediately: boolean = true): void {
    this._navPlan = navPlan;

    if (navImmediately) {
      this._state = NavState.waiting;
      navPlan.getNextWaypoint(this._pos).then((wp) => {
        if (wp) {
          this._setNavWaypoint(wp);
        }
      });
    }
  }

  private _setNavWaypoint(wp: Waypoint): void {
    const hasPath = this.setTargetPos({
      targetPos: wp.pos,
      nearestIsOk: wp.nearestIsOk,
    });
    this._navSpeed = wp.speed;
    if (!hasPath) {
      console.error(`Failed to find path to waypoint ${wp}`);
    }
    this._waypointPause = new Delay(wp.pause, wp.pause, true);
  }

  onReachTarget(): void {
    this.clearTarget();
    if (this._navPlan.hasNextWaypoint(this._pos)) {
      this._state = NavState.waiting;
    } else {
      this._state = NavState.stopped;
    }
  }

  async setTargetPos({
    targetPos,
    nearestIsOk = true,
    speed = 1.0,
  }: {
    targetPos: Vector2;
    nearestIsOk?: boolean;
    speed?: number;
  }): Promise<boolean> {
    this.clearTarget();

    this._state = NavState.pending;
    this._targetPath = (
      await navigation.findPath({
        graphicsKey: this.id,
        startPos: this._pos.toVector(),
        endPos: targetPos,
        nearestIsOk,
      })
    ).map((v) => Vec2.fromVector2(v));
    this._targetPathLen = this._pathProgress();

    // Even if `nearestIsOk` is true, it's still possible not to find a path, if
    // your start and end are two separate "islands" of nodes.
    if (this._targetPath.length > 0) {
      this._initialPos = this._pos;
      this._targetPos = Vec2.fromVector2(targetPos);
      this._navSpeed = speed;

      this.collisions = false;
      this._state = NavState.moving;
    }

    return this._targetPath.length > 0;
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
    this._visible = enabled;
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
    this._state = NavState.waiting;
    this._targetPath = [];
    this._targetPos = new Vec2(0, 0);
    this._lastTrackResult = { index: -1, distance: 0, t: 0 };
    this._stuckTimer = 0;
    this._velocity = new Vec2(0, 0);
    this.direction = new Vec2(0, 0);
    this.collisions = true;
    navigation.clearPath(this.id); // clears the debug line
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

    if (this._state === NavState.waiting) {
      if (this._waypointPause.tick(deltaMs)) {
        const wp = await this._navPlan.getNextWaypoint(this._pos);
        if (wp) {
          this._setNavWaypoint(wp);
        }
      }
    } else if (this._state === NavState.moving) {
      // This lets us interrupt our current nav plan. Useful if our plan is to
      // attack if the player is near, and we're moving randomly otherwise.
      const needsNewWaypoint = await this._navPlan.tick(deltaMs, this._pos);
      if (needsNewWaypoint) {
        const wp = await this._navPlan.getNextWaypoint(this._pos);
        if (wp) {
          this._setNavWaypoint(wp);
        }
      }
    }

    const props = char.getMoveProps(this.id);
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
          this.setTargetPos({ targetPos: this._targetPos });
          return;
        } else {
          this._stuckTimer += deltaMs;
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
        this.setTargetPos({ targetPos: this._targetPos });
      }
      // Happy path
      else {
        const targetNode = this._targetPath[trackResult.index]!;
        const adjust = targetNode.subbed(this._pos).capScalar(1);
        this.direction.add(adjust).normalize();

        const progress: number = this._pathProgress(
          trackResult.index,
          trackResult.t,
        );
        easingSpeed = Math.max(
          easing.rampHoldRamp(
            this._targetPathLen,
            progress,
            this.startWalkMomentum,
            this.endWalkMomentum,
          ),
          0.3,
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

      moveAction = CharAction.Idle;
    }

    // Slow down our animation speed based on our speed relative to our max speed.
    const animSpeed = Math.min(
      1.0,
      Math.max(0.4, this._velocity.magnitude / 35),
    );
    char.setSpeed(this.id, animSpeed);
    char.setPos(this.id, this._pos.x, this._pos.y);
    this.setAction(moveAction);
  }

  public hurt(dir: Vec2) {
    const behavior = hurt(this, dir);
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
  c?.setTargetPos({ targetPos: pos, speed });
}
