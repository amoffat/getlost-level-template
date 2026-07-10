/**
 * A tiny, fully-synchronous test harness.
 *
 * It intentionally uses no promises, `setTimeout`, or other async scheduling:
 * the suite runs inside the host's QuickJS context, where timer/promise
 * lifecycles are driven by the game loop and don't compose with a test runner's
 * deferred execution (that's why the async, per-test-timeout zora runner failed
 * here). `test()` only registers; everything runs synchronously when
 * {@link runAllTests} is called.
 *
 * Each message is emitted via {@link emit} as a structured {@link TestRecord}
 * (a plain object — never a Set/Map, which aborts the QuickJS host). Records
 * carry their fields rather than a pre-rendered line, so consumers switch on
 * `kind` instead of parsing text. The `gl: "test"` sentinel identifies a record
 * in one property read; `tags` exists for tag-based log routing downstream.
 *
 * Test files import only from this module, so the underlying framework can be
 * replaced without touching any test.
 */

/** Identifies a harness record in a single property read. */
const TEST_SENTINEL = "test";

interface RecordEnvelope {
  gl: typeof TEST_SENTINEL;
  tags: string[];
}

/** Announces the test whose assertions follow. */
interface TestRecordTest {
  kind: "test";
  name: string;
}

/** A passing assertion. */
interface TestRecordPass {
  kind: "pass";
  n: number;
  description: string;
}

/** A failing assertion, with rendered `expected`/`actual` when it was a comparison. */
interface TestRecordFail {
  kind: "fail";
  n: number;
  description: string;
  expected?: string;
  actual?: string;
}

/** A test spec that threw outside of an assertion. */
interface TestRecordError {
  kind: "error";
  name: string;
  error: string;
}

/** Emitted once, after every test has run. */
interface TestRecordSummary {
  kind: "summary";
  total: number;
  passed: number;
  failed: number;
}

/** A single structured log record emitted by the harness. */
export type TestRecord = RecordEnvelope &
  (
    | TestRecordTest
    | TestRecordPass
    | TestRecordFail
    | TestRecordError
    | TestRecordSummary
  );

type Payload =
  | TestRecordTest
  | TestRecordPass
  | TestRecordFail
  | TestRecordError
  | TestRecordSummary;

/** Emits one structured harness record. */
function emit(payload: Payload): void {
  const record = {
    gl: TEST_SENTINEL,
    tags: ["test"],
    ...payload,
  } as TestRecord;
  console.log(record);
}

/** The assertion API handed to each test spec. */
export interface Assert {
  /** Passes when `value` is truthy. */
  ok(value: unknown, description?: string): void;
  /** Passes when `value` is falsy. */
  notOk(value: unknown, description?: string): void;
  /** Passes when `actual` deeply equals `expected`. */
  eq(actual: unknown, expected: unknown, description?: string): void;
  /** Alias for {@link Assert.eq}. */
  equal(actual: unknown, expected: unknown, description?: string): void;
  /** Passes when `actual` is `expected` (`Object.is`). */
  is(actual: unknown, expected: unknown, description?: string): void;
  /** Passes when `fn` throws. */
  throws(fn: () => void, description?: string): void;
  /** Always fails; useful in unreachable branches. */
  fail(description?: string): void;
}

type Spec = (t: Assert) => void;

interface TestCase {
  description: string;
  spec: Spec;
}

const registry: TestCase[] = [];

/**
 * Register a test. The spec runs later, when {@link runAllTests} is called.
 */
export function test(description: string, spec: Spec): void {
  registry.push({ description, spec });
}

interface State {
  passed: number;
  failed: number;
  counter: number;
}

/**
 * Runs every registered test synchronously, emits structured records, and
 * returns `true` when all assertions passed.
 */
export function runAllTests(): boolean {
  const state: State = { passed: 0, failed: 0, counter: 0 };

  for (const testCase of registry) {
    emit({ kind: "test", name: testCase.description });
    const t = createAssert(state);
    try {
      testCase.spec(t);
    } catch (e) {
      state.failed++;
      emit({ kind: "error", name: testCase.description, error: safe(e) });
    }
  }

  emit({
    kind: "summary",
    total: state.counter,
    passed: state.passed,
    failed: state.failed,
  });
  return state.failed === 0;
}

function record(
  state: State,
  pass: boolean,
  description: string | undefined,
  comparison?: { expected: unknown; actual: unknown },
): void {
  state.counter++;
  const label = description ?? "";
  if (pass) {
    state.passed++;
    emit({ kind: "pass", n: state.counter, description: label });
    return;
  }

  state.failed++;
  if (comparison === undefined) {
    emit({ kind: "fail", n: state.counter, description: label });
  } else {
    emit({
      kind: "fail",
      n: state.counter,
      description: label,
      expected: safe(comparison.expected),
      actual: safe(comparison.actual),
    });
  }
}

function createAssert(state: State): Assert {
  const compare = (
    actual: unknown,
    expected: unknown,
    description: string | undefined,
    pass: boolean,
  ): void => {
    record(state, pass, description, pass ? undefined : { expected, actual });
  };

  return {
    ok: (value, description) => record(state, Boolean(value), description),
    notOk: (value, description) => record(state, !value, description),
    eq: (actual, expected, description) =>
      compare(actual, expected, description, deepEqual(actual, expected)),
    equal: (actual, expected, description) =>
      compare(actual, expected, description, deepEqual(actual, expected)),
    is: (actual, expected, description) =>
      compare(actual, expected, description, Object.is(actual, expected)),
    fail: (description) => record(state, false, description),
    throws: (fn, description) => {
      let threw = false;
      try {
        fn();
      } catch {
        threw = true;
      }
      record(state, threw, description);
    },
  };
}

/**
 * Structural deep equality for primitives, arrays, plain objects, Sets, and
 * Maps. Sets and Maps compare by content: `Object.keys` reports no keys for
 * either, so without the dedicated branches below two differing Sets would
 * compare equal.
 */
function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (
    typeof a !== "object" ||
    typeof b !== "object" ||
    a === null ||
    b === null
  ) {
    return false;
  }

  const aArr = Array.isArray(a);
  const bArr = Array.isArray(b);
  if (aArr !== bArr) return false;
  if (aArr && bArr) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  const aSet = a instanceof Set;
  const bSet = b instanceof Set;
  if (aSet !== bSet) return false;
  if (aSet && bSet) return setEqual(a, b);

  const aMap = a instanceof Map;
  const bMap = b instanceof Map;
  if (aMap !== bMap) return false;
  if (aMap && bMap) return mapEqual(a, b);

  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;
  const aKeys = Object.keys(aObj);
  const bKeys = Object.keys(bObj);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    if (!Object.prototype.hasOwnProperty.call(bObj, key)) return false;
    if (!deepEqual(aObj[key], bObj[key])) return false;
  }
  return true;
}

function setEqual(a: Set<unknown>, b: Set<unknown>): boolean {
  if (a.size !== b.size) return false;
  for (const value of a) {
    // Fast path for primitives and shared references; fall back to a scan so
    // structurally-equal object members still match.
    if (b.has(value)) continue;
    if (!some(b, (candidate) => deepEqual(value, candidate))) return false;
  }
  return true;
}

function mapEqual(a: Map<unknown, unknown>, b: Map<unknown, unknown>): boolean {
  if (a.size !== b.size) return false;
  for (const [key, value] of a) {
    if (b.has(key)) {
      if (!deepEqual(value, b.get(key))) return false;
      continue;
    }
    // Structurally-equal (but non-identical) key: find its counterpart.
    let matched = false;
    for (const [otherKey, otherValue] of b) {
      if (deepEqual(key, otherKey) && deepEqual(value, otherValue)) {
        matched = true;
        break;
      }
    }
    if (!matched) return false;
  }
  return true;
}

function some<T>(values: Iterable<T>, predicate: (value: T) => boolean): boolean {
  for (const value of values) {
    if (predicate(value)) return true;
  }
  return false;
}

/**
 * Renders a value to a display string. Never returns a Set/Map object (they
 * abort the QuickJS host when logged); nested ones are expanded so a Set inside
 * an object doesn't stringify to `{}`, as do Errors (no enumerable own keys).
 */
function safe(value: unknown): string {
  try {
    if (value instanceof Error) {
      return value.name + ": " + value.message;
    }
    const json = JSON.stringify(value, (_key, val: unknown) => {
      if (val instanceof Error) return val.name + ": " + val.message;
      if (val instanceof Set) return { "Set(entries)": Array.from(val) };
      if (val instanceof Map) return { "Map(entries)": Array.from(val) };
      return val;
    });
    return json === undefined ? String(value) : json;
  } catch {
    return String(value);
  }
}
