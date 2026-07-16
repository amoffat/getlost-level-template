/**
 * A probe for whether `async`/`await` works end-to-end inside the host's
 * QuickJS test run. If these pass (and the harness summary is emitted after
 * them), the engine drains the promise-job queue after `__internal__test()`
 * returns, and async specs are viable — meaning navigation/pathfinding code can
 * be tested by awaiting it directly rather than reaching for synchronous seams.
 *
 * If async does NOT work, expect the output to stop after the first `await`
 * (records for later tests and the final summary would never be emitted).
 */
import { test } from "../harness";

test("async: awaiting a resolved promise observes its value", async (t) => {
  const value = await Promise.resolve(42);
  t.eq(value, 42, "awaited value is observed");
});

test("async: a chain of awaited microtasks runs in order", async (t) => {
  const order: number[] = [];
  await Promise.resolve().then(() => order.push(1));
  await Promise.resolve().then(() => order.push(2));
  await Promise.resolve().then(() => order.push(3));
  t.eq(order, [1, 2, 3], "microtasks resolved in registration order");
});

test("async: an awaited async helper returns to the assertion", async (t) => {
  const double = async (n: number): Promise<number> => {
    await Promise.resolve();
    return n * 2;
  };
  const result = await double(21);
  t.eq(result, 42, "control returned to the spec after the await");
});

test("async: a rejected promise can be caught within the spec", async (t) => {
  let caught = false;
  try {
    await Promise.reject(new Error("boom"));
  } catch {
    caught = true;
  }
  t.ok(caught, "rejection was catchable across an await");
});
