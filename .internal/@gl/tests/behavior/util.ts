import { Action, Behavior } from "@gl/utils/behavior";

/**
 * Collects when each named action started/ended, keyed by action name. Times
 * are the behavior's elapsed ms at the moment the lifecycle hook fired.
 */
export class Recorder {
  public time = 0;
  public starts: Record<string, number> = {};
  public ends: Record<string, number> = {};
}

/**
 * A minimal {@link Action} that records its start/end times into a
 * {@link Recorder}. Pure — it touches no host APIs, so it is safe to run under
 * QuickJS and Node alike.
 */
export class Probe extends Action<unknown> {
  private _rec: Recorder;

  constructor(name: string, durationMs: number, rec: Recorder) {
    super({ name, durationMs });
    this._rec = rec;
  }

  override onActionStart(): void {
    this._rec.starts[this.name] = this._rec.time;
  }

  override onActionEnd(): void {
    this._rec.ends[this.name] = this._rec.time;
  }
}

/**
 * Builds a behavior, starts it, and drives it frame-by-frame (bypassing the
 * globalTicker) until it finishes, advancing `rec.time` in lockstep so probes
 * stamp accurate elapsed times.
 */
export function run(
  rec: Recorder,
  build: (b: Behavior<unknown>) => void,
  deltaMs = 16,
  maxFrames = 1000,
): Behavior<unknown> {
  const subject = {} as unknown;
  const b = new Behavior<unknown>("root", subject);
  build(b);
  b.onActionStart({ subject });
  const tick = tickerOf(b);
  let frames = 0;
  while (!b.isDone && frames < maxFrames) {
    frames++;
    rec.time += deltaMs;
    tick(deltaMs);
  }
  return b;
}

/**
 * Returns a bound reference to a behavior's private per-frame tick. Tests drive
 * this directly so they don't depend on the host-driven globalTicker.
 */
export function tickerOf(b: Behavior<unknown>): (deltaMs: number) => void {
  return (b as unknown as { _tickBehavior(d: number): void })._tickBehavior.bind(
    b,
  );
}
