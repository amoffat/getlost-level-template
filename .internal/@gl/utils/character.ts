import * as char from "@gl/api/char";
import * as navigation from "@gl/api/navigation";
import { hurt } from "@gl/behaviors/hurt";
import { globalTicker } from "@gl/ticker";

import { type WavyParams } from "@gl/actions/WavyAction";
import { jump } from "@gl/behaviors/jump";
import type { CharacterController } from "@gl/controllers";
import { NavPlan, StationaryPlan } from "@gl/nav";
import { type Vector2 } from "@gl/types/api/vector";
import { Behavior } from "./behavior";
import { Delay } from "./delay";
import { NavManager } from "./movement";
import { Vec2 } from "./vec2";

export enum Direction {
  North,
  South,
  East,
  West,
}

export const chars: Map<string, Character> = new Map();
const baseMoveForce: number = 10000;

/** One entry on a character's custom-action stack. The top entry overrides the
 * movement-derived action until it is popped or its duration elapses. */
interface CustomAction {
  id: number;
  action: string;
  /** Absolute animation speed for this action (not velocity-scaled). */
  speed: number;
  /** Timed expiry. When null, the entry persists until explicitly popped. */
  duration: Delay | null;
}

export class Character {
  private _initialPos: Vec2;
  private _pos: Vec2 = new Vec2(0, 0);
  private _velocity: Vec2 = new Vec2(0, 0);
  // Knockback/impulse velocity, tracked separately from _velocity so it can be
  // exempted from the maxVelocity cap (which would otherwise clip a strong
  // impulse back down while the character is being driven by a nav plan).
  private _impulseVelocity: Vec2 = new Vec2(0, 0);
  private _controlDirection: Vec2 = new Vec2(0, 0);
  public speed: number = 1.0;
  private _moveForce: Vec2 = Vec2.fromVal(baseMoveForce);
  public mass: number = 40;
  public maxVelocity: Vec2 = Vec2.fromMagnitude(100);
  public id: string;
  private _isPlayer: boolean = false;

  private _controller: CharacterController | null = null;
  private _activeJump: Behavior<Character> | null = null;

  /** The action the movement system wants to play this frame (walk/stand). */
  private _moveAction: string = "Idle";
  /** Velocity-scaled animation speed for the movement action. */
  private _moveAnimSpeed: number = 1.0;

  /** LIFO stack of custom actions. While non-empty, the top entry overrides the
   * movement action. Entries are added via pushCustomAction and removed via
   * popCustomAction, clearCustomAction, or their own duration elapsing. */
  private _customStack: CustomAction[] = [];
  private _nextCustomId: number = 1;

  /** Last values pushed to the engine, so redundant setAction/setSpeed calls are
   * skipped. */
  private _appliedAction: string | null = null;
  private _appliedSpeed: number | null = null;

  public nav: NavManager;
  private _lookAtFn: (() => Vector2) | null = null;
  private _lookAtWhileMoving: boolean = false;
  private _standingDir: Vec2 = new Vec2(0, 1);

  /** Tags set in the editor. You may use and manipulate these in your level
   * code */
  public tags: Set<string> = new Set();

  constructor(id: string) {
    this.id = id;
    this._initialPos = Vec2.fromVector2(char.getPos(id));
    this._pos = this._initialPos.clone();
    this._isPlayer = this.id == "player";
    chars.set(id, this);

    this.nav = new NavManager({ charId: id, getPos: () => this._pos });
    this.nav.onClearTarget = () => {
      this.collisions = true;
      navigation.clearPath(this.id);
      this._velocity = new Vec2(0, 0);
      this._controlDirection = new Vec2(0, 0);
    };
    this.nav.onInstallPath = () => {
      this.collisions = false;
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

  public resetPos() {
    this.nav.setNavPlan(new StationaryPlan(this._initialPos));
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

  public setNavPlan(plan: NavPlan) {
    this.nav.setNavPlan(plan);
  }

  /**
   * Sends the character to `targetPos` (pathfinding around obstacles). The
   * returned promise stays pending until the character arrives — resolving to
   * the route it took — or resolves `false` if the move never completes (no
   * path, or interrupted by a newer navigation intent). Await it to sequence on
   * arrival.
   */
  public navigateTo({
    targetPos,
    speed,
    durationMs,
  }: {
    targetPos: Vector2;
    speed?: number;
    durationMs?: number;
  }): Promise<Vec2[] | false> {
    return this.nav.navigateTo({ targetPos, speed, durationMs });
  }

  /**
   * Registers a callback fired when the character settles within `epsilon` of
   * `pos`. Returns an unsubscribe function. Delegates to {@link NavManager.onReach}.
   */
  public onReach(
    pos: Vector2,
    cb: () => void,
    opts?: { epsilon?: number },
  ): VoidFunction {
    return this.nav.onReach(pos, cb, opts);
  }

  /** Callback fired when the character settles at the named waypoint. */
  public onReachWaypoint(
    name: string,
    cb: () => void,
    opts?: { epsilon?: number },
  ): VoidFunction {
    return this.nav.onReachWaypoint(name, cb, opts);
  }

  /** Promise resolving the first time the character settles near `pos`. */
  public whenReached(pos: Vector2, opts?: { epsilon?: number }): Promise<void> {
    return this.nav.whenReached(pos, opts);
  }

  /** Promise resolving the first time the character settles at the waypoint. */
  public whenReachedWaypoint(
    name: string,
    opts?: { epsilon?: number },
  ): Promise<void> {
    return this.nav.whenReachedWaypoint(name, opts);
  }

  /**
   * Registers a callback fired once when navigation progress (0..1 along the
   * current path) first reaches `threshold`. Re-arms each new navigation.
   */
  public onProgress(
    threshold: number,
    cb: (progress: number) => void,
  ): VoidFunction {
    return this.nav.onProgress(threshold, cb);
  }

  /** Promise resolving the first time progress reaches `threshold`. */
  public whenProgress(threshold: number): Promise<void> {
    return this.nav.whenProgress(threshold);
  }

  public getCenterOfMass(): Vec2 {
    return this._pos.subbed({ x: 0, y: 8 });
  }

  public getPos(): Vec2 {
    return this._pos.clone();
  }

  public setPos(newPos: Vec2): void {
    this._pos = newPos.clone();
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
    this._impulseVelocity.add({
      x: impulse.x / this.mass,
      y: impulse.y / this.mass,
    });
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

  /** The action currently displayed: the top custom action if any, otherwise
   * the movement-derived action. */
  public getAction(): string {
    return this._customStack.at(-1)?.action ?? this._moveAction;
  }

  /**
   * Push a custom action onto the stack. While it is the top of the stack it
   * overrides the movement-derived action, playing at its own absolute speed.
   *
   * @param action The animation action to play.
   * @param durationMs How long to hold the action before it removes itself. Omit
   * to hold it until it is explicitly popped/cleared.
   * @param speed The animation speed for this action (default 1.0). Unlike the
   * movement action this is not scaled by velocity.
   * @returns A handle that can be passed to popCustomAction to remove this exact
   * entry.
   */
  public pushCustomAction({
    action,
    durationMs,
    speed = 1.0,
  }: {
    action: string;
    durationMs?: number;
    speed?: number;
  }): number {
    const id = this._nextCustomId++;
    this._customStack.push({
      id,
      action,
      speed,
      duration: durationMs != null ? new Delay({ timeMs: durationMs }) : null,
    });
    return id;
  }

  /**
   * Remove a custom action from the stack. Pass the handle returned by
   * pushCustomAction to remove that exact entry (a no-op if it already expired);
   * omit it to remove the top entry.
   */
  public popCustomAction(id?: number): void {
    if (id == null) {
      this._customStack.pop();
      return;
    }
    const idx = this._customStack.findIndex((e) => e.id === id);
    if (idx !== -1) this._customStack.splice(idx, 1);
  }

  /** Remove all custom actions, returning the character to movement animation. */
  public clearCustomAction(): void {
    this._customStack = [];
  }

  /** Resolve the top custom action (or the movement action) and push it, plus
   * the matching animation speed, to the engine — skipping redundant calls. */
  private _applyAnimation(): void {
    const top = this._customStack.at(-1) ?? null;
    const action = top ? top.action : this._moveAction;
    const speed = top ? top.speed : this._moveAnimSpeed;
    if (action !== this._appliedAction) {
      this._appliedAction = action;
      char.setAction(this.id, action);
    }
    if (speed !== this._appliedSpeed) {
      this._appliedSpeed = speed;
      char.setSpeed(this.id, speed);
    }
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

  public setVisibility(enabled: boolean) {
    char.toggle(this.id, enabled);
  }

  public lookAt({
    fn,
    whileMoving = false,
  }: {
    fn: () => Vector2;
    whileMoving?: boolean;
    opposite?: boolean;
  }): void {
    this._lookAtFn = fn;
    this._lookAtWhileMoving = whileMoving;
  }

  public clearLookAt(): void {
    this._lookAtFn = null;
    this._lookAtWhileMoving = false;
  }

  protected getMoveAction(dir: Vec2): string {
    // Choose the walk action based on the direction of movement, considering
    // that this is a 2.5D game, so up and down are not as pronounced.
    if (Math.abs(dir.x) > Math.abs(dir.y * 0.5)) {
      return dir.x < 0 ? "WalkLeft" : "WalkRight";
    } else {
      return dir.y < 0 ? "WalkUp" : "WalkDown";
    }
  }

  protected getStandAction(dir: Vec2): string {
    if (Math.abs(dir.x) > Math.abs(dir.y)) {
      return dir.x < 0 ? "StandLeft" : "StandRight";
    } else {
      return dir.y < 0 ? "StandUp" : "StandDown";
    }
  }

  /**
   * Do not call directly. The engine calls this.
   * @param deltaMs
   * @returns
   */
  public async tick(deltaMs: number): Promise<void> {
    const dtSec: number = deltaMs / 1000;

    // Count down timed custom actions and drop any that have elapsed, wherever
    // they sit in the stack.
    if (this._customStack.length) {
      this._customStack = this._customStack.filter(
        (e) => !e.duration?.tick(deltaMs),
      );
    }

    if (this._controller) {
      this._controller.tick(deltaMs, this);
      char.setPos(this.id, this._pos.x, this._pos.y);
      this._applyAnimation();
      if (this._controller.isDone) this.detachController();
      return;
    }

    const movementResult = await this.nav.tick(deltaMs, this._pos);

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

    let moveAction: string = this._moveAction;
    if (moveDir.x != 0 || moveDir.y != 0) {
      if (movementResult?.timedVelocity) {
        // Timed move: drive velocity directly so we arrive within the
        // duration, bypassing force accumulation, the maxVelocity cap, and
        // friction.
        this._velocity = movementResult.timedVelocity.clone();
      } else {
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
      }

      // Impulse velocity is exempt from the cap above (so knockback isn't
      // clipped to maxVelocity), but still decays via friction.
      this._impulseVelocity.x *= frictionFactor;
      this._impulseVelocity.y *= frictionFactor;
      this._impulseVelocity.truncate(0.001);

      // Where would we ideally end up if no collisions?
      const proposedTrans = this._velocity
        .added(this._impulseVelocity)
        .scale(dtSec);

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
      this._impulseVelocity.x *= frictionFactor;
      this._impulseVelocity.y *= frictionFactor;

      // Don't allow infinitely small velocities (which affect walk sound)
      this._velocity.truncate(0.001);
      this._impulseVelocity.truncate(0.001);

      const proposedTrans = this._velocity
        .added(this._impulseVelocity)
        .scale(dtSec);

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
      const target = Vec2.fromVector2(this._lookAtFn());
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

    // Slow down our animation speed based on our speed relative to our max
    // speed. This is the movement layer's speed; a custom action overrides it
    // with its own absolute speed in _applyAnimation.
    this._moveAnimSpeed = Math.min(
      1.0,
      Math.max(0.4, this._velocity.magnitude / 35),
    );
    this._moveAction = moveAction;
    char.setPos(this.id, this._pos.x, this._pos.y);
    this._applyAnimation();
  }

  public hurt(dir: Vec2) {
    const behavior = hurt(this, { mode: "impulse", dir });
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

  /** Cancel any in-progress jump. No-op if the character isn't jumping. */
  public cancelActiveJump(): void {
    if (this._activeJump) {
      this._activeJump.cancel();
      this._activeJump = null;
    }
  }

  public setHeight(height: number): void {
    char.setHeight(this.id, height);
  }

  public getHeight(): number {
    return char.getHeight(this.id);
  }

  public getController(): CharacterController | null {
    return this._controller;
  }

  /**
   * Attach a controller that positions this character precisely each tick,
   * taking precedence over automatic (MovementManager) movement. It's the
   * controller's responsibility (in `onAttach`) to resolve any conflicting
   * effects it can't coexist with — e.g. cancelling an in-progress jump.
   */
  public attachController(controller: CharacterController): void {
    if (this._controller) this._controller.onDetach(this);
    this._controller = controller;
    controller.onAttach(this);
  }

  /**
   * Detach the active controller, returning the character to automatic
   * movement. Any previously set nav target/plan resumes on the next tick.
   */
  public detachController(): void {
    if (!this._controller) return;
    this._controller.onDetach(this);
    this._controller = null;
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
  const c = chars.get(charId);
  c?.navigateTo({ targetPos: pos, speed });
}
