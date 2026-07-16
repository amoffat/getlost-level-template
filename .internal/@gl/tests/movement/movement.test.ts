import { NavPlan } from "@gl/nav/NavPlan";
import { StationaryPlan } from "@gl/nav/StationaryPlan";
import type { Vector2 } from "@gl/types/api/vector";
import { NavManager, type NavDeps } from "@gl/utils/movement";
import { Vec2 } from "@gl/utils/vec2";
import { Waypoint } from "@gl/utils/waypoint";
import { test } from "../harness";

/**
 * NavManager pathfinds through a single injected host function, findPath. The
 * real one isn't available (or deterministic) in the test context, so every
 * test injects this fake. `findPath` resolves to the scripted `nextPath` once
 * and then reverts to "no path found" — mirroring a real pathfinder whose
 * result depends on the requested target, so an incidental re-request (e.g. a
 * plan re-consulting after the target clears) doesn't resurrect a stale path.
 * The call counter is how we observe that a re-navigation was kicked off (stuck
 * / off-path recovery both funnel through it). Non-pathfinding host effects
 * (collision, clearing the rendered path) are surfaced via the
 * onInstallPath/onClearTarget callbacks, spied on separately.
 */
class FakeNavDeps implements NavDeps {
  public findPathCalls = 0;
  /** The path the next findPath call resolves to; consumed once when read. */
  public nextPath: Vector2[] = [];

  findPath = (_opts: {
    graphicsKey?: string;
    startPos: Vector2;
    endPos: Vector2;
    nearestIsOk: boolean;
    max?: number;
  }): Promise<Vector2[]> => {
    this.findPathCalls++;
    const path = this.nextPath;
    this.nextPath = [];
    return Promise.resolve(path);
  };
}

/** A nav plan that hands out a fixed queue of waypoints, one per request. */
class ScriptedPlan extends NavPlan {
  private _queue: Waypoint[];
  constructor(waypoints: Waypoint[]) {
    super();
    this._queue = waypoints;
  }
  override async getNextWaypoint(): Promise<Waypoint | null> {
    return this._queue.shift() ?? null;
  }
  override hasNextWaypoint(): boolean {
    return this._queue.length > 0;
  }
}

/** Read-only view onto NavManager's private state, for white-box assertions. */
interface NavInternals {
  _state: number;
  _targetPath: Vec2[];
  _stuckTimer: number;
}

// Mirrors the private NavState enum in movement.ts (declaration order).
const NavState = {
  stopped: 0,
  pending: 1,
  moving: 2,
  powerMoving: 3,
  waiting: 4,
} as const;

/** Counts the host-effect callbacks NavManager fires at its owner. */
interface CallbackSpy {
  installPath: number;
  clearTarget: number;
}

/**
 * Builds a NavManager with an injected fake pathfinder, a spy on the owner
 * callbacks (which stand in for the collision/clear-path host effects), and a
 * read-only view of its private state.
 */
function makeNav(startPos: Vector2 = { x: 0, y: 0 }): {
  nav: NavManager;
  deps: FakeNavDeps;
  events: CallbackSpy;
  intern: NavInternals;
} {
  const deps = new FakeNavDeps();
  const pos = Vec2.fromVector2(startPos);
  const nav = new NavManager("hero", () => pos, deps);
  const events: CallbackSpy = { installPath: 0, clearTarget: 0 };
  nav.onInstallPath = () => events.installPath++;
  nav.onClearTarget = () => events.clearTarget++;
  return { nav, deps, events, intern: nav as unknown as NavInternals };
}

/**
 * Installs a direct (uninterruptible) move along the scripted `path` and awaits
 * it — the async pathfind completes before we return, so the move is active.
 */
function goTo(
  nav: NavManager,
  deps: FakeNavDeps,
  path: Vector2[],
  opts: { speed?: number; durationMs?: number } = {},
): Promise<boolean> {
  deps.nextPath = path;
  return nav.setTargetPos({ targetPos: path[path.length - 1]!, ...opts });
}

/** Flush pending microtasks so a fire-and-forget nav request settles. */
async function settle(turns = 20): Promise<void> {
  for (let i = 0; i < turns; i++) await Promise.resolve();
}

const A = { x: 0, y: 0 };
const B = { x: 100, y: 0 };

test("a fresh NavManager is stationary and produces no movement", async (t) => {
  const { nav } = makeNav();
  t.ok(nav.getNavPlan() instanceof StationaryPlan, "defaults to a StationaryPlan");
  t.is(await nav.tick(16, new Vec2(0, 0)), null, "no path -> no movement");
});

test("a move heads toward the goal and disables collision", async (t) => {
  const { nav, deps, events } = makeNav();
  await goTo(nav, deps, [A, B]);
  t.eq(events.installPath, 1, "onInstallPath fired (owner disables collision)");

  const result = await nav.tick(16, new Vec2(0, 0));
  t.ok(result !== null, "produces a movement result");
  t.ok(result!.direction.x > 0.99, "heads in +x toward the goal");
  t.ok(Math.abs(result!.direction.y) < 0.01, "no vertical drift on a horizontal path");
  t.ok(Math.abs(result!.direction.magnitude - 1) < 1e-6, "direction is normalized");
});

test("navSpeed from the move flows into the movement result", async (t) => {
  const { nav, deps } = makeNav();
  await goTo(nav, deps, [A, B], { speed: 2.5 });
  const result = await nav.tick(16, new Vec2(0, 0));
  t.eq(result!.navSpeed, 2.5, "navSpeed matches the requested speed");
});

test("setTargetPos is an uninterruptible (override) move", async (t) => {
  const { nav, deps, intern } = makeNav();
  await goTo(nav, deps, [A, B]);
  // powerMoving is the override state: tick() consults neither branch of the
  // plan machine while it's set, so the direct move can't be preempted.
  t.is(intern._state, NavState.powerMoving, "direct move overrides the plan");
});

test("a plan-driven move is interruptible (moving state)", async (t) => {
  const { nav, deps, intern } = makeNav();
  deps.nextPath = [A, B];
  nav.setNavPlan(new ScriptedPlan([new Waypoint({ pos: B })]));
  await settle(); // let the fire-and-forget waypoint request resolve

  t.is(intern._state, NavState.moving, "plan-driven move can be interrupted");
  t.ok(intern._targetPath.length > 0, "a path was installed from the plan");
});

test("reaching the goal clears the target and notifies the owner", async (t) => {
  const { nav, deps, events, intern } = makeNav();
  await goTo(nav, deps, [A, B]);
  const clearsBefore = events.clearTarget;

  // Arrive within 1px of the final node.
  const result = await nav.tick(16, new Vec2(100, 0));
  t.is(result, null, "no movement once the goal is reached");
  t.eq(intern._targetPath.length, 0, "the active path is cleared");
  t.ok(
    events.clearTarget > clearsBefore,
    "onClearTarget fired on arrival (owner re-enables collision, clears path)",
  );
  t.is(
    intern._state,
    NavState.stopped,
    "a StationaryPlan has no next waypoint, so we stop",
  );
});

test("a plan with a next waypoint waits (not stops) on arrival", async (t) => {
  const { nav, deps, intern } = makeNav();
  // Set the plan without navigating immediately, then arrive at a direct target.
  nav.setNavPlan(new ScriptedPlan([new Waypoint({ pos: { x: 200, y: 0 } })]), false);
  await goTo(nav, deps, [A, B]);

  await nav.tick(16, new Vec2(100, 0));
  t.is(intern._state, NavState.waiting, "waits to consult the plan for the next hop");
});

test("straying far off the path triggers a re-navigation", async (t) => {
  const { nav, deps } = makeNav();
  await goTo(nav, deps, [A, B]);
  const before = deps.findPathCalls;

  // >32px away from the polyline: recovery re-issues the current target.
  const result = await nav.tick(16, new Vec2(50, 50));
  t.is(result, null, "no movement on the recovery frame");
  t.eq(deps.findPathCalls, before + 1, "a re-navigation (findPath) was kicked off");
});

test("staying on the path (near it) does not trigger a re-navigation", async (t) => {
  const { nav, deps } = makeNav();
  await goTo(nav, deps, [A, B]);
  const before = deps.findPathCalls;
  const result = await nav.tick(16, new Vec2(40, 5)); // only 5px off the line
  t.ok(result !== null, "keeps moving");
  t.eq(deps.findPathCalls, before, "no recovery re-navigation while on-path");
});

test("no progress eventually trips the stuck timeout and re-navigates", async (t) => {
  const { nav, deps } = makeNav();
  await goTo(nav, deps, [A, B]);
  const stuckPos = new Vec2(0, 0);
  const installs = deps.findPathCalls;

  // First tick establishes the baseline track result (index changes from the
  // initial sentinel), so it can't count as stuck yet.
  const first = await nav.tick(16, stuckPos);
  t.ok(first !== null, "still moving on the first frame");
  t.eq(deps.findPathCalls, installs, "not yet re-navigated");

  // The stuck timeout is 2000ms; grind past it from the same spot and catch the
  // frame that gives up and re-navigates.
  let recoveryResult: unknown = "unset";
  const frames = Math.ceil(2000 / 16) + 8;
  for (let i = 0; i < frames; i++) {
    const beforeCalls = deps.findPathCalls;
    const result = await nav.tick(16, stuckPos);
    if (deps.findPathCalls > beforeCalls) {
      recoveryResult = result;
      break;
    }
  }
  t.is(recoveryResult, null, "the stuck frame gives up moving and re-navigates");
});

test("making progress keeps the stuck timer from accumulating", async (t) => {
  const { nav, deps, intern } = makeNav();
  await goTo(nav, deps, [A, { x: 1000, y: 0 }]);
  const before = deps.findPathCalls;

  // Walk steadily along the path; the stuck timer should keep resetting.
  for (let x = 0; x <= 500; x += 20) {
    await nav.tick(16, new Vec2(x, 0));
  }
  t.eq(intern._stuckTimer, 0, "stuck timer stays reset while advancing");
  t.eq(deps.findPathCalls, before, "no stuck-recovery re-navigation while progressing");
});

test("a timed move reports the velocity to finish on schedule", async (t) => {
  const { nav, deps } = makeNav();
  // 100px path that must be covered in 1000ms => ~100 px/s.
  await goTo(nav, deps, [A, B], { durationMs: 1000 });
  const result = await nav.tick(16, new Vec2(0, 0));
  t.ok(result!.timedVelocity !== undefined, "timed moves carry a timedVelocity");
  const speed = result!.timedVelocity!.magnitude;
  // ~remaining-distance / remaining-time; the first frame has consumed 16ms.
  t.ok(speed > 100 && speed < 103, "velocity is ~100 px/s (remaining / remaining-time)");
});

test("a non-timed move carries no timedVelocity", async (t) => {
  const { nav, deps } = makeNav();
  await goTo(nav, deps, [A, B]);
  const result = await nav.tick(16, new Vec2(0, 0));
  t.is(result!.timedVelocity, undefined, "plain moves leave timedVelocity unset");
});

test("clearTarget stops movement and notifies the owner", async (t) => {
  const { nav, deps, events, intern } = makeNav();
  await goTo(nav, deps, [A, B]);
  const clearsBefore = events.clearTarget;
  nav.clearTarget();
  t.eq(intern._targetPath.length, 0, "path is emptied");
  t.is(intern._state, NavState.waiting, "returns to waiting");
  t.ok(events.clearTarget > clearsBefore, "onClearTarget fired (owner restores collision)");
  t.is(await nav.tick(16, new Vec2(0, 0)), null, "no movement after clear");
});
