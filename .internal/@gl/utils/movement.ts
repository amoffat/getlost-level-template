import * as char from "@gl/api/char";
import * as navigation from "@gl/api/navigation";

import { NavPlan, StationaryPlan } from "@gl/nav";
import type { Vector2 } from "@gl/types/api/vector";
import { Delay } from "./delay";
import * as easing from "./easing";
import { deriveTargetIndex, type TrackResult } from "./paths";
import { Vec2 } from "./vec2";

const stuckTRate: number = 0.1; // T units per second
const stuckTimeout: number = 2000; // ms

enum NavState {
  /** All movement stopped */
  stopped,
  /** Awaiting for a move command to be determined */
  pending,
  /** Processing a plan-driven move command; the nav plan may preempt it. */
  moving,
  /** Processing an uninterruptible direct move (setTargetPos): the nav plan is
   * NOT consulted until the target is reached. */
  powerMoving,
  /** Waiting for the next move command */
  waiting,
}

export interface MovementResult {
  direction: Vec2;
  easingSpeed: number;
  navSpeed: number;
  /** Set only for timed moves: the exact velocity (px/s) the character should
   * move at this frame to complete the path within the requested duration.
   * Bypasses force/friction/maxVelocity. */
  timedVelocity?: Vec2;
}

export class NavManager {
  private readonly _charId: string;
  private readonly _getPos: () => Vec2;

  private _navPlan: NavPlan;
  private _navSpeed: number = 1.0;
  private _state: NavState = NavState.stopped;

  private _targetPos: Vec2 = new Vec2(0, 0);
  private _targetPath: Vec2[] = [];
  private _targetPathLen: number = 0;
  private _stuckTimer: number = 0;
  private _lastTrackResult: TrackResult = { index: -1, distance: 0, t: 0 };
  private _waypointPause: Delay = new Delay({ timeMs: 1000, repeat: true });

  // When set, the active move must complete within this many ms. The character
  // is then driven at the exact velocity needed to cover the remaining path in
  // the remaining time (see the timedVelocity path in tick()).
  private _moveDurationMs: number | null = null;
  private _moveElapsedMs: number = 0;

  // Monotonic id stamped on each navigation intent (a new plan, or a new
  // target). Target-setting is async — it awaits pathfinding partway through —
  // and is fired off from several places (setNavPlan, both tick branches,
  // external setTargetPos). Without this, a stale pathfind that resolves *after*
  // a newer intent arrived would still write its results and clobber the newer
  // target, leaving the character walking to (or stopping at) the wrong place.
  // Each async step captures the current id and bails if it's been superseded.
  private _navRequestId: number = 0;

  public startWalkMomentum: number = 5;
  public endWalkMomentum: number = 15;

  /**
   * Called whenever the active path is cleared — including when a target is
   * reached, a new path is started (clears the old one first), or clearTarget()
   * is called directly. Character uses this to reset velocity and direction.
   */
  public onTargetCleared: (() => void) | null = null;

  constructor(charId: string, getPos: () => Vec2) {
    this._charId = charId;
    this._getPos = getPos;
    this._navPlan = new StationaryPlan(getPos());
  }

  getNavPlan(): NavPlan {
    return this._navPlan;
  }

  setNavPlan(navPlan: NavPlan, navImmediately: boolean = true): void {
    this._navPlan = navPlan;

    if (navImmediately) {
      this._state = NavState.waiting;
      void this._requestNextWaypoint(this._getPos());
    }
  }

  /**
   * The single choke point for "consult the current plan for the next waypoint
   * and start heading there." Opens a fresh navigation request — superseding any
   * still in flight — and commits the waypoint only if this request is still the
   * latest once the plan (and, downstream, pathfinding) resolves. Every path
   * that (re)starts movement funnels through here, so the take-latest staleness
   * guard lives in one place rather than duplicated at each call site.
   */
  private async _requestNextWaypoint(curPos: Vec2): Promise<void> {
    const requestId = this._beginNavRequest();
    const wp = await this._navPlan.getNextWaypoint(curPos);
    if (wp && this._isCurrentNavRequest(requestId)) {
      this._navigateTo({
        targetPos: wp.pos,
        nearestIsOk: wp.nearestIsOk,
        requestId,
        interruptible: true,
      });
      this._navSpeed = wp.speed;
      this._waypointPause = new Delay({
        timeMs: wp.pause,
        initialDelay: wp.pause,
        repeat: true,
      });
    }
  }

  /**
   * Opens a new navigation request, superseding any still in flight. Async work
   * started under the returned id must re-check {@link _isCurrentNavRequest}
   * after every await before committing results, so a stale request can never
   * clobber a newer one (take-latest / cancel-stale).
   */
  private _beginNavRequest(): number {
    return ++this._navRequestId;
  }

  /** True while `requestId` is still the latest navigation request. */
  private _isCurrentNavRequest(requestId: number): boolean {
    return requestId === this._navRequestId;
  }

  private _onReachTarget(curPos: Vec2): void {
    this.clearTarget();
    if (this._navPlan.hasNextWaypoint(curPos)) {
      this._state = NavState.waiting;
    } else {
      this._state = NavState.stopped;
    }
  }

  /**
   * Navigates directly to a position, overriding the nav plan for the duration
   * of the move. Unlike a plan-driven move, the nav plan is not consulted while
   * this move is in flight, so it cannot be preempted (see NavState.powerMoving
   * in tick()). Control returns to the plan once the target is reached — or
   * immediately if no path exists.
   */
  async setTargetPos(opts: {
    targetPos: Vector2;
    nearestIsOk?: boolean;
    speed?: number;
    durationMs?: number;
  }): Promise<boolean> {
    // A direct target request supersedes any in-flight navigation.
    return this._navigateTo({
      ...opts,
      requestId: this._beginNavRequest(),
      interruptible: false,
    });
  }

  /**
   * Re-issues the current target while preserving whether the active move is
   * interruptible, so a stuck/off-path recovery of a plan-driven move doesn't
   * silently upgrade it to an uninterruptible direct move (and vice versa).
   */
  private _reissueCurrentTarget(): void {
    const interruptible = this._state !== NavState.powerMoving;
    // `_targetPos` is captured here before _navigateTo's clearTarget() resets it.
    void this._navigateTo({
      targetPos: this._targetPos,
      interruptible,
      requestId: this._beginNavRequest(),
    });
  }

  /**
   * The raw underlying pathfinding function. All navigation goes through this
   * to find the path.
   *
   * @param param0
   * @param requestId
   * @returns
   */
  private async _navigateTo({
    targetPos,
    nearestIsOk = true,
    speed = 1.0,
    durationMs,
    requestId,
    interruptible = true,
  }: {
    targetPos: Vector2;
    nearestIsOk?: boolean;
    speed?: number;
    durationMs?: number;
    requestId: number;
    interruptible?: boolean;
  }): Promise<boolean> {
    this.clearTarget();

    this._state = NavState.pending;
    const path = (
      await navigation.findPath({
        graphicsKey: this._charId,
        startPos: this._getPos().toVector(),
        endPos: targetPos,
        nearestIsOk,
      })
    ).map((v) => Vec2.fromVector2(v));

    // A newer navigation intent (plan swap, resetPos, or another target) arrived
    // while we were pathfinding. Discard these now-stale results so we don't
    // clobber the newer target and strand the character.
    if (!this._isCurrentNavRequest(requestId)) {
      return false;
    }

    this._targetPath = path;
    this._targetPathLen = this._pathProgress();

    if (this._targetPath.length > 0) {
      this._targetPos = Vec2.fromVector2(targetPos);
      this._navSpeed = speed;
      this._moveDurationMs = durationMs ?? null;
      this._moveElapsedMs = 0;
      char.makeCollidable(this._charId, false);
      this._state = interruptible ? NavState.moving : NavState.powerMoving;
    } else {
      // No path was found (e.g. target already reached, or momentarily
      // unreachable). Fall back to `waiting` rather than leaving the machine in
      // `pending`: the tick loop only advances `waiting`/`moving`, so a
      // stranded `pending` would silently freeze the character — it would never
      // consult its plan again, so a combatant could never re-scan or re-pair.
      // `waiting` re-consults the plan on the next pause, letting it recover.
      this._state = NavState.waiting;
    }

    return this._targetPath.length > 0;
  }

  clearTarget(): void {
    this._state = NavState.waiting;
    this._targetPath = [];
    this._targetPos = new Vec2(0, 0);
    this._lastTrackResult = { index: -1, distance: 0, t: 0 };
    this._stuckTimer = 0;
    this._moveDurationMs = null;
    this._moveElapsedMs = 0;
    char.makeCollidable(this._charId, true);
    navigation.clearPath(this._charId);
    this.onTargetCleared?.();
  }

  /**
   * Calculates a path length of the navigation path. Used to calculate the
   * full length (no args) or a partial length (up to some index).
   *
   * @param end The end index to calculate up towards. Defaults to total length
   * of the path minus 1.
   * @param t How far along the last segment we are.
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

  /**
   * Ticks the navigation state machine and path tracker.
   *
   * @returns A MovementResult with the direction to move and speed modifiers,
   * or null when there is no active movement (stopped or waiting).
   */
  async tick(deltaMs: number, curPos: Vec2): Promise<MovementResult | null> {
    if (this._moveDurationMs !== null) {
      this._moveElapsedMs += deltaMs;
    }

    if (this._state === NavState.waiting) {
      if (this._waypointPause.tick(deltaMs)) {
        await this._requestNextWaypoint(curPos);
      }
    } else if (this._state === NavState.moving) {
      // This lets us interrupt our current nav plan. Useful if our plan is to
      // attack if the player is near, and we're moving randomly otherwise.
      const needsNewWaypoint = await this._navPlan.tick(deltaMs, curPos);
      if (needsNewWaypoint) {
        await this._requestNextWaypoint(curPos);
      }
    }

    if (this._targetPath.length === 0) {
      return null;
    }

    const trackResult = deriveTargetIndex(curPos, this._targetPath);
    const adjustedGoal = this._targetPath.at(-1)!;
    const goalDist = curPos.distanceTo(adjustedGoal);

    const oldTrackResult = this._lastTrackResult;
    this._lastTrackResult = trackResult;

    const dtSec = deltaMs / 1000;
    const maybeStuck =
      this._lastTrackResult.index == oldTrackResult.index &&
      Math.abs(oldTrackResult.t - trackResult.t) < stuckTRate * dtSec;

    if (maybeStuck) {
      // FIXME
      if (this._stuckTimer > stuckTimeout) {
        this._reissueCurrentTarget();
        return null;
      } else {
        this._stuckTimer += deltaMs;
      }
    } else {
      this._stuckTimer = 0;
    }

    if (goalDist < 1) {
      this._onReachTarget(curPos);
      return null;
    } else if (trackResult.distance > 32) {
      this._reissueCurrentTarget();
      return null;
    } else {
      const targetNode = this._targetPath[trackResult.index]!;
      const adjust = targetNode.subbed(curPos).capScalar(1);
      const direction = Vec2.zero().add(adjust).normalize();

      const progress = this._pathProgress(trackResult.index, trackResult.t);
      const easingSpeed = Math.max(
        easing.rampHoldRamp(
          this._targetPathLen,
          progress,
          this.startWalkMomentum,
          this.endWalkMomentum,
        ),
        0.3,
      );

      let timedVelocity: Vec2 | undefined;
      if (this._moveDurationMs !== null) {
        const remainingSec =
          (this._moveDurationMs - this._moveElapsedMs) / 1000;
        if (remainingSec <= dtSec) {
          // Final frame: step straight onto the goal node so we land exactly
          // on time.
          timedVelocity = adjustedGoal.subbed(curPos).scaled(1 / dtSec);
        } else {
          const remaining = Math.max(this._targetPathLen - progress, goalDist);
          timedVelocity = direction.scaled(remaining / remainingSec);
        }
      }

      return {
        direction,
        easingSpeed,
        navSpeed: this._navSpeed,
        timedVelocity,
      };
    }
  }
}
