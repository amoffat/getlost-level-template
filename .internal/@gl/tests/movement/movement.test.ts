import { PATH_DEBOUNCED } from "@gl/api/navigation";
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
  /**
   * What the next findPath call resolves to; consumed once, then reverts to
   * `null` (the host's "no path found" signal). Mirrors the real tri-state
   * return: a route (`Vector2[]`), no route (`null`), or superseded
   * (`PATH_DEBOUNCED`).
   */
  public nextPath: Vector2[] | null | typeof PATH_DEBOUNCED = null;

  // Typed off NavDeps so the fake's signature can't drift from the real host
  // binding (param shape and the tri-state return come straight from it).
  findPath: NavDeps["findPath"] = () => {
    this.findPathCalls++;
    const path = this.nextPath;
    this.nextPath = null;
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
  const nav = new NavManager({ charId: "hero", getPos: () => pos, deps });
  const events: CallbackSpy = { installPath: 0, clearTarget: 0 };
  nav.onInstallPath = () => events.installPath++;
  nav.onClearTarget = () => events.clearTarget++;
  return { nav, deps, events, intern: nav as unknown as NavInternals };
}

/**
 * Installs a direct (uninterruptible) move along the scripted `path` and settles
 * pending microtasks so the async pathfind completes and the move is active. It
 * deliberately does NOT await the setTargetPos promise: under the new semantics
 * that promise stays pending until the character actually *arrives* (or fails),
 * so awaiting it here would hang. Tests that need the terminal result call
 * setTargetPos directly and hold onto the promise (see the resolution tests).
 */
async function goTo(
  nav: NavManager,
  deps: FakeNavDeps,
  path: Vector2[],
  opts: { speed?: number; durationMs?: number } = {},
): Promise<void> {
  deps.nextPath = path;
  void nav.navigateTo({ targetPos: path[path.length - 1]!, ...opts });
  await settle();
}

/** Flush pending microtasks so a fire-and-forget nav request settles. */
async function settle(turns = 20): Promise<void> {
  for (let i = 0; i < turns; i++) await Promise.resolve();
}

const A = { x: 0, y: 0 };
const B = { x: 100, y: 0 };

test("a fresh NavManager is stationary and produces no movement", async (t) => {
  const { nav } = makeNav();
  t.ok(
    nav.getNavPlan() instanceof StationaryPlan,
    "defaults to a StationaryPlan",
  );
  t.is(await nav.tick(16, new Vec2(0, 0)), null, "no path -> no movement");
});

test("a move heads toward the goal and disables collision", async (t) => {
  const { nav, deps, events } = makeNav();
  await goTo(nav, deps, [A, B]);
  t.eq(events.installPath, 1, "onInstallPath fired (owner disables collision)");

  const result = await nav.tick(16, new Vec2(0, 0));
  t.ok(result !== null, "produces a movement result");
  t.ok(result!.direction.x > 0.99, "heads in +x toward the goal");
  t.ok(
    Math.abs(result!.direction.y) < 0.01,
    "no vertical drift on a horizontal path",
  );
  t.ok(
    Math.abs(result!.direction.magnitude - 1) < 1e-6,
    "direction is normalized",
  );
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
  nav.setNavPlan(
    new ScriptedPlan([new Waypoint({ pos: { x: 200, y: 0 } })]),
    false,
  );
  await goTo(nav, deps, [A, B]);

  await nav.tick(16, new Vec2(100, 0));
  t.is(
    intern._state,
    NavState.waiting,
    "waits to consult the plan for the next hop",
  );
});

test("straying far off the path triggers a re-navigation", async (t) => {
  const { nav, deps } = makeNav();
  await goTo(nav, deps, [A, B]);
  const before = deps.findPathCalls;

  // >32px away from the polyline: recovery re-issues the current target.
  const result = await nav.tick(16, new Vec2(50, 50));
  t.is(result, null, "no movement on the recovery frame");
  t.eq(
    deps.findPathCalls,
    before + 1,
    "a re-navigation (findPath) was kicked off",
  );
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
  t.is(
    recoveryResult,
    null,
    "the stuck frame gives up moving and re-navigates",
  );
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
  t.eq(
    deps.findPathCalls,
    before,
    "no stuck-recovery re-navigation while progressing",
  );
});

test("a timed move reports the velocity to finish on schedule", async (t) => {
  const { nav, deps } = makeNav();
  // 100px path that must be covered in 1000ms => ~100 px/s.
  await goTo(nav, deps, [A, B], { durationMs: 1000 });
  const result = await nav.tick(16, new Vec2(0, 0));
  t.ok(
    result!.timedVelocity !== undefined,
    "timed moves carry a timedVelocity",
  );
  const speed = result!.timedVelocity!.magnitude;
  // ~remaining-distance / remaining-time; the first frame has consumed 16ms.
  t.ok(
    speed > 100 && speed < 103,
    "velocity is ~100 px/s (remaining / remaining-time)",
  );
});

test("a non-timed move carries no timedVelocity", async (t) => {
  const { nav, deps } = makeNav();
  await goTo(nav, deps, [A, B]);
  const result = await nav.tick(16, new Vec2(0, 0));
  t.is(
    result!.timedVelocity,
    undefined,
    "plain moves leave timedVelocity unset",
  );
});

test("clearTarget stops movement and notifies the owner", async (t) => {
  const { nav, deps, events, intern } = makeNav();
  await goTo(nav, deps, [A, B]);
  const clearsBefore = events.clearTarget;
  nav.clearTarget();
  t.eq(intern._targetPath.length, 0, "path is emptied");
  t.is(intern._state, NavState.waiting, "returns to waiting");
  t.ok(
    events.clearTarget > clearsBefore,
    "onClearTarget fired (owner restores collision)",
  );
  t.is(await nav.tick(16, new Vec2(0, 0)), null, "no movement after clear");
});

test("the move promise resolves with the traveled route on arrival", async (t) => {
  const { nav, deps } = makeNav();
  deps.nextPath = [A, B];
  // Hold the promise: it must stay pending across ticks until the goal is hit.
  const reached = nav.navigateTo({ targetPos: B });
  await settle(); // let the pathfind resolve and install the path

  const result = await nav.tick(16, new Vec2(100, 0)); // arrive within 1px of B
  t.is(result, null, "no movement once the goal is reached");

  const route = await reached;
  t.ok(Array.isArray(route), "resolves to the path array, not false");
  t.eq((route as Vec2[]).length, 2, "resolves with the route it took (A -> B)");
});

test("the move promise resolves false when no path is found", async (t) => {
  const { nav, deps } = makeNav();
  deps.nextPath = null; // host signals "no path found"
  const result = await nav.navigateTo({ targetPos: B });
  t.is(result, false, "an unreachable target resolves false");
});

test("a debounced findPath response bails without clobbering a newer move", async (t) => {
  const { nav, deps, intern } = makeNav();

  // Older move A: the host debounces it (superseded), resolving PATH_DEBOUNCED.
  deps.nextPath = PATH_DEBOUNCED;
  const a = nav.navigateTo({ targetPos: { x: 50, y: 50 } });
  // Newer move B (the trailing request) resolves a real path.
  deps.nextPath = [A, B];
  void nav.navigateTo({ targetPos: B });
  await settle();

  t.is(await a, false, "the superseded (debounced) move resolves false");
  t.ok(
    intern._targetPath.length > 0,
    "the newer move installed its path (debounced result was not mistaken for one)",
  );
  // nav.navigateTo issues uninterruptible direct moves, so the installed state
  // is powerMoving (not moving) — see "setTargetPos is an uninterruptible move".
  t.is(
    intern._state,
    NavState.powerMoving,
    "ends in the newer (direct) move, not stranded",
  );
});

test("a superseded move resolves false (interrupted)", async (t) => {
  const { nav, deps } = makeNav();
  deps.nextPath = [A, B];
  const first = nav.navigateTo({ targetPos: B });
  await settle(); // install the first (in-flight) move

  // A second direct move supersedes the first before it can arrive.
  deps.nextPath = [A, { x: 50, y: 50 }];
  void nav.navigateTo({ targetPos: { x: 50, y: 50 } });

  t.is(await first, false, "the interrupted move resolves false");
  await settle();
});

// --- reach watchers (settle-at-coordinate) --------------------------------
// These fire from the single arrival choke point (_onReachTarget), so only a
// genuine settle at a target triggers them — never an interior node walked
// through. onReachWaypoint just resolves a name to coords (host getWaypointByName)
// and delegates to onReach; that host lookup isn't available to the pure harness,
// so the delegation is exercised structurally through onReach below.

test("onReach fires when the character settles at the watched coordinate", async (t) => {
  const { nav, deps } = makeNav();
  await goTo(nav, deps, [A, B]);
  let hits = 0;
  nav.onReach(B, () => hits++);
  await nav.tick(16, new Vec2(100, 0)); // arrive/settle within 1px of B
  t.eq(hits, 1, "settling at the target fires the watcher once");
});

test("onReach does NOT fire for a point merely passed through", async (t) => {
  const { nav, deps } = makeNav();
  const mid = { x: 50, y: 0 }; // on the path, but not the destination
  await goTo(nav, deps, [A, B]); // destination is B (100,0)
  let midHits = 0;
  let goalHits = 0;
  nav.onReach(mid, () => midHits++);
  nav.onReach(B, () => goalHits++);

  await nav.tick(16, new Vec2(50, 0)); // walk THROUGH the midpoint
  t.eq(midHits, 0, "no arrival choke point at an interior node -> no fire");

  await nav.tick(16, new Vec2(100, 0)); // settle at the destination
  t.eq(goalHits, 1, "settling at the destination fires");
  t.eq(midHits, 0, "the passed-through point still never fired");
});

test("onReach honors epsilon around the settle point", async (t) => {
  const { nav, deps } = makeNav();
  await goTo(nav, deps, [A, B]); // settles at (100,0)
  let near = 0;
  let far = 0;
  nav.onReach({ x: 103, y: 0 }, () => near++); // 3px away, default epsilon 4
  nav.onReach({ x: 110, y: 0 }, () => far++, { epsilon: 4 }); // 10px away
  await nav.tick(16, new Vec2(100, 0));
  t.eq(near, 1, "within epsilon of the settle point fires");
  t.eq(far, 0, "outside epsilon does not fire");
});

test("onReach's unsubscribe stops future fires", async (t) => {
  const { nav, deps } = makeNav();
  await goTo(nav, deps, [A, B]);
  let hits = 0;
  const off = nav.onReach(B, () => hits++);
  off();
  await nav.tick(16, new Vec2(100, 0));
  t.eq(hits, 0, "an unsubscribed watcher does not fire");
});

test("whenReached resolves once the character settles near the coordinate", async (t) => {
  const { nav, deps } = makeNav();
  await goTo(nav, deps, [A, B]);
  let resolved = false;
  void nav.whenReached(B).then(() => {
    resolved = true;
  });
  await nav.tick(16, new Vec2(100, 0)); // arrive
  await settle();
  t.ok(resolved, "the whenReached promise resolves on arrival");
});

// --- progress watchers ----------------------------------------------------

test("onProgress fires once when normalized progress reaches the threshold", async (t) => {
  const { nav, deps } = makeNav();
  await goTo(nav, deps, [A, B]); // 100px path
  const seen: number[] = [];
  nav.onProgress(0.5, (p) => seen.push(p));

  await nav.tick(16, new Vec2(20, 0)); // ~0.2 -> below threshold
  t.eq(seen.length, 0, "does not fire before the threshold");

  await nav.tick(16, new Vec2(60, 0)); // ~0.6 -> crosses 0.5
  t.eq(seen.length, 1, "fires once at/after the threshold");
  t.ok(seen[0]! >= 0.5, "reports a normalized progress >= threshold");

  await nav.tick(16, new Vec2(80, 0)); // still past threshold
  t.eq(seen.length, 1, "does not re-fire within the same navigation");
});

test("onProgress re-arms on a new navigation", async (t) => {
  const { nav, deps } = makeNav();
  await goTo(nav, deps, [A, B]);
  let hits = 0;
  nav.onProgress(0.5, () => hits++);
  await nav.tick(16, new Vec2(60, 0)); // crosses -> hit 1
  t.eq(hits, 1, "fires on the first navigation");

  await goTo(nav, deps, [A, B]); // fresh navigation re-arms the watcher
  await nav.tick(16, new Vec2(60, 0)); // crosses again -> hit 2
  t.eq(hits, 2, "fires again for the new navigation");
});
