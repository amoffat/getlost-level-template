import { globalTicker } from "@gl/ticker";
import { Animator } from "./animation";
import { Easings, type EasingFunction } from "./easing";

export type ActionCallback = () => void;
export type ProgressCallback = (args: {
  progress: number;
  elapsed: number;
}) => boolean | undefined;

/**
 * Action is the "atom" of a {@link Behavior}. It represents some simple
 * tickable action, like a movement, or a sound effect, or a color change. Many
 * of these actions can be strung together into a {@link Behavior} to create
 * more complex animations.
 */
export abstract class Action<Subject> {
  /**
   * A unique identifier for this type of action, used as part of the key
   * when registering listeners on a {@link Behavior}.
   */
  protected readonly _name: string;
  protected readonly durationMs: number;
  private _animator: Animator;

  constructor({
    name,
    durationMs,
    easing = Easings.linear,
  }: {
    name: string;
    durationMs: number;
    easing?: EasingFunction;
  }) {
    this._name = name;
    this.durationMs = durationMs;
    this._animator = new Animator({
      durationMs,
      forwardCurve: easing,
    });
  }

  public get name(): string {
    return this._name;
  }

  /**
   * Returns the total duration of this action in milliseconds.
   */
  public getDuration(): number {
    return this.durationMs;
  }

  /**
   * @param subject The subject to operate on
   * @param progress The progress of this action as a value between 0 and 1,
   * calculated as `elapsed / duration` and modified by the internal animator's
   * easing curve if provided.
   */
  tick(_args: { subject: Subject; progress: number; elapsed: number }): void {}

  /**
   * Whether this action has completed. By default this is determined by the
   * internal {@link Animator} finishing playback.
   */
  get isDone(): boolean {
    return !this._animator.isAnimating;
  }

  /**
   * @internal Called by {@link Behavior} before {@link onActionStart} to
   * start the internal animator.
   */
  _initAnimator({ subject }: { subject: Subject }): void {
    this._animator.addProgressCallback(({ progress, elapsed }) => {
      this.tick({ subject, progress, elapsed });
    });
    this._animator.play();
  }

  /**
   * @internal Called by {@link Behavior} each frame. Ticks the
   * internal animator, then calls {@link tick}.
   */
  _internalTick({ deltaMs }: { subject: Subject; deltaMs: number }): void {
    this._animator.tick(deltaMs);
  }

  /**
   * Called once when this action first becomes the active action.
   */
  onActionStart(_args: { subject: Subject }): void {}

  /**
   * Called once when this action completes.
   */
  onActionEnd(_args: { subject: Subject }): void {}
}

/**
 * A Behavior represents a series of {@link Action} to perform. Some actions may
 * be performed sequentially, some concurrently, it depends on if they were
 * added via {@link Behavior.then} or {@link Behavior.also}.
 *
 * Conceptually, the Behavior is a collection of separate actions that makes up
 * some larger...behavior. But the Behavior is itself an {@link Action}, meaning
 * it can be added to another Behavior. An example might be a "slide-jump"
 * behavior, which is made up of the "slide" and "jump" behaviors, and the
 * "slide" behavior might be movement along the ground as an action with a
 * concurrent sound effect action.
 */
/**
 * A single action placed on the behavior's execution timeline with an absolute
 * start time (ms from behavior start). {@link Behavior} schedules every main and
 * side action as an entry and drives them by comparing {@link startTime} against
 * the elapsed time.
 */
interface ScheduleEntry<Subject> {
  action: Action<Subject>;
  /** Absolute start time in ms from behavior start, clamped to `>= 0`. */
  startTime: number;
  /** Listener key for main actions; `null` for side (also) actions. */
  key: string | null;
  /** Stable tie-break for entries sharing a {@link startTime}. */
  order: number;
  /** Whether `action` is a {@link Behavior} (needs listener-context forwarding). */
  isBehavior: boolean;
  started: boolean;
  active: boolean;
}

export class Behavior<Subject> extends Action<Subject> {
  // Build-time state
  private _actions: Action<Subject>[] = [];
  private _sideActions: Map<number, Action<Subject>[]> = new Map();
  // Per-slot start offsets (ms). thenOffset shifts a slot's main action (and,
  // via the build cursor, everything after it); alsoOffset shifts side actions
  // relative to their slot start without moving the cursor.
  private _leadOffsets: Map<number, number> = new Map();
  private _sideOffsets: Map<number, number[]> = new Map();

  // Execution state (initialised in onStart)
  private _subject: Subject;
  private _started: boolean = false;
  private _schedule: ScheduleEntry<Subject>[] = [];
  private _cancelled: boolean = false;

  // Listener state
  private _prefix: string = "";
  private _startListeners: Map<string, ActionCallback[]> = new Map();
  private _endListeners: Map<string, ActionCallback[]> = new Map();
  private _actionKeys: string[] = [];
  private _validKeys: Set<string> = new Set();
  private _behaviorEndListeners: ActionCallback[] = [];
  private _behaviorEndFired: boolean = false;

  // Progress state
  private _elapsedMs: number = 0;
  private _progressCallbacks: ProgressCallback[] = [];

  constructor(name: string, subject: Subject) {
    super({ name, durationMs: 0 });
    this._subject = subject;
  }

  /** @internal Behavior manages its own lifecycle; no animator needed. */
  override _initAnimator(): void {}

  override get isDone(): boolean {
    return (
      this._started &&
      (this._cancelled ||
        this._schedule.every((e) => e.started && !e.active))
    );
  }

  /** @internal When used as a sub-behavior, the parent drives ticking here. */
  override _internalTick({
    deltaMs,
  }: {
    subject: Subject;
    deltaMs: number;
  }): void {
    this._tickBehavior(deltaMs);
  }

  public then(...actions: Action<Subject>[]): Behavior<Subject> {
    return this.thenOffset(0, ...actions);
  }

  /**
   * Like {@link then}, but shifts the start of the first chained action by
   * `offsetMs`. A positive offset delays the action (inserting a gap after the
   * previous action); a negative offset starts it earlier, overlapping the
   * previous action. The shift is folded into the sequential timeline, so
   * everything chained afterwards moves with it. Absolute start times are
   * clamped to `>= 0`.
   *
   * When several actions are passed, `offsetMs` applies to the first; the rest
   * chain sequentially after it with no additional offset.
   */
  public thenOffset(
    offsetMs: number,
    ...actions: Action<Subject>[]
  ): Behavior<Subject> {
    const firstIndex = this._actions.length;
    this._actions.push(...actions);
    if (offsetMs !== 0 && actions.length > 0) {
      this._leadOffsets.set(firstIndex, offsetMs);
    }
    return this;
  }

  /**
   * Runs the given actions concurrently alongside the previously chained action.
   * The side actions start when the preceding action starts and do not block it.
   */
  public also(...actions: Action<Subject>[]): Behavior<Subject> {
    return this.alsoOffset(0, ...actions);
  }

  /**
   * Like {@link also}, but shifts the start of the side actions by `offsetMs`
   * relative to their slot's start. A positive offset delays them; a negative
   * offset starts them earlier, before their main action (overlapping into the
   * previous slot). Unlike {@link thenOffset}, this never moves the sequential
   * timeline. Absolute start times are clamped to `>= 0`.
   */
  public alsoOffset(
    offsetMs: number,
    ...actions: Action<Subject>[]
  ): Behavior<Subject> {
    const prevIndex = this._actions.length - 1;
    if (!this._sideActions.has(prevIndex)) {
      this._sideActions.set(prevIndex, []);
      this._sideOffsets.set(prevIndex, []);
    }
    this._sideActions.get(prevIndex)!.push(...actions);
    const offsets = this._sideOffsets.get(prevIndex)!;
    for (let i = 0; i < actions.length; i++) {
      offsets.push(offsetMs);
    }
    return this;
  }

  /**
   * @internal Called by a parent {@link Behavior} to forward its listener
   * maps so that actions inside this sub-behavior can fire callbacks
   * registered on the root.
   */
  _setListenerContext(
    prefix: string,
    startListeners: Map<string, ActionCallback[]>,
    endListeners: Map<string, ActionCallback[]>,
  ): void {
    this._prefix = prefix;
    this._startListeners = startListeners;
    this._endListeners = endListeners;
  }

  /**
   * Called once when this behavior starts.
   * @param param0 The subject on which the behavior is performed.
   */
  public override onActionStart({ subject }: { subject: Subject }): void {
    if (this._started) {
      throw new Error(
        `Behavior "${this._name}" can only be used once. Create a new instance to perform it again.`,
      );
    }
    this._started = true;
    this._subject = subject;
    this._actionKeys = this._computeActionKeys();
    this._collectValidKeys(this._actions, this._prefix, this._validKeys);
    this._buildSchedule();
  }

  /**
   * Walk the sequential slots, assigning every main and side action an absolute
   * start time on the behavior's timeline. The build cursor advances by each
   * slot's main-action duration only (long side actions spill past their slot as
   * background work rather than delaying the next slot). `thenOffset` shifts a
   * slot's start (and, through the cursor, everything after it); `alsoOffset`
   * shifts a side action relative to its slot start without moving the cursor.
   */
  private _buildSchedule(): void {
    let cursor = 0;
    let order = 0;
    for (let slotIndex = 0; slotIndex < this._actions.length; slotIndex++) {
      const main = this._actions[slotIndex]!;
      const lead = this._leadOffsets.get(slotIndex) ?? 0;
      const slotStart = Math.max(0, cursor + lead);
      this._schedule.push({
        action: main,
        startTime: slotStart,
        key: this._actionKeys[slotIndex]!,
        order: order++,
        isBehavior: main instanceof Behavior,
        started: false,
        active: false,
      });

      const sides = this._sideActions.get(slotIndex) ?? [];
      const sideOffsets = this._sideOffsets.get(slotIndex) ?? [];
      for (let j = 0; j < sides.length; j++) {
        const side = sides[j]!;
        const off = sideOffsets[j] ?? 0;
        this._schedule.push({
          action: side,
          startTime: Math.max(0, slotStart + off),
          key: null,
          order: order++,
          isBehavior: side instanceof Behavior,
          started: false,
          active: false,
        });
      }

      cursor = slotStart + main.getDuration();
    }
  }

  /**
   * Registers a callback to be invoked when the action identified by `key`
   * begins its first tick.
   *
   * Keys use the format `name[idx]` where `name` is the action's
   * {@link Action.name} and `idx` is its zero-based occurrence index among
   * actions sharing that name in the chain.
   *
   * For actions inside a sub-behavior, extend the key with a dot:
   * `behaviorName[idx].actionName[subIdx]`.
   */
  public onSubActionStart(key: string, callback: ActionCallback): this {
    if (!this._validKeys.has(key)) {
      console.error(
        `onSubActionStart: key "${key}" does not match any action. ` +
          `Valid keys: ${[...this._validKeys].join(", ")}`,
      );
      return this;
    }
    if (!this._startListeners.has(key)) {
      this._startListeners.set(key, []);
    }
    this._startListeners.get(key)!.push(callback);
    return this;
  }

  /**
   * Registers a callback to be invoked when the action identified by `key`
   * completes.
   *
   * Keys use the format `name[idx]` where `name` is the action's
   * {@link Action.name} and `idx` is its zero-based occurrence index among
   * actions sharing that name in the chain.
   *
   * For actions inside a sub-behavior, extend the key with a dot:
   * `behaviorName[idx].actionName[subIdx]`.
   */
  public onSubActionEnd(key: string, callback: ActionCallback): this {
    if (!this._validKeys.has(key)) {
      console.error(
        `onSubActionEnd: key "${key}" does not match any action. ` +
          `Valid keys: ${[...this._validKeys].join(", ")}`,
      );
      return this;
    }
    if (!this._endListeners.has(key)) {
      this._endListeners.set(key, []);
    }
    this._endListeners.get(key)!.push(callback);
    return this;
  }

  /**
   * Registers a callback to be invoked once when the entire behavior
   * finishes (all sequential and background actions are complete).
   */
  public onBehaviorEnd(callback: ActionCallback): this {
    this._behaviorEndListeners.push(callback);
    return this;
  }

  /**
   * Returns the total duration of this behavior in milliseconds: the latest
   * finish time across every action on the timeline, accounting for `then`/
   * `also` structure and any `thenOffset`/`alsoOffset` shifts. Computed by a
   * pure re-walk of the slots so it is safe to call before the behavior starts
   * (e.g. when a parent behavior sums its children's durations).
   */
  public override getDuration(): number {
    let cursor = 0;
    let total = 0;
    for (let slotIndex = 0; slotIndex < this._actions.length; slotIndex++) {
      const main = this._actions[slotIndex]!;
      const lead = this._leadOffsets.get(slotIndex) ?? 0;
      const slotStart = Math.max(0, cursor + lead);
      total = Math.max(total, slotStart + main.getDuration());

      const sides = this._sideActions.get(slotIndex) ?? [];
      const sideOffsets = this._sideOffsets.get(slotIndex) ?? [];
      for (let j = 0; j < sides.length; j++) {
        const start = Math.max(0, slotStart + (sideOffsets[j] ?? 0));
        total = Math.max(total, start + sides[j]!.getDuration());
      }

      cursor = slotStart + main.getDuration();
    }
    return total;
  }

  /**
   * Registers a callback to be invoked each tick with the current progress
   * (0–1) and elapsed time in milliseconds of this behavior.
   */
  public onProgress(callback: ProgressCallback): this {
    this._progressCallbacks.push(callback);
    return this;
  }

  /**
   * Immediately stops this behavior. Any in-progress actions are dropped without
   * their `onActionEnd` firing. The next tick will detect completion and
   * unsubscribe from the global ticker.
   */
  public cancel(): void {
    if (!this._started || this._behaviorEndFired) return;
    this._cancelled = true;
  }

  public perform(): Behavior<Subject> {
    this.onActionStart({ subject: this._subject });
    const tick = (deltaMs: number) => this._tickBehavior(deltaMs);
    globalTicker.subscribe(tick);
    this.onBehaviorEnd(() => {
      globalTicker.unsubscribe(tick);
    });
    return this;
  }

  private _tickBehavior(deltaMs: number): void {
    const entity = this._subject!;

    if (!this._cancelled) {
      this._elapsedMs += deltaMs;

      // Phase A: tick already-active entries, retiring the ones that finish.
      for (const entry of this._schedule) {
        if (!entry.active) continue;
        this._tickEntry(entry, entity, deltaMs);
      }

      // Phase B: start any entries whose time has come (in `order`), giving each
      // its first tick on the same frame it activates.
      for (const entry of this._schedule) {
        if (entry.started || this._elapsedMs < entry.startTime) continue;
        entry.started = true;
        entry.active = true;

        // If this action is a sub-behavior, forward listener context so its
        // actions can fire callbacks registered on the root.
        if (entry.isBehavior && entry.key) {
          (entry.action as Behavior<Subject>)._setListenerContext(
            entry.key + ".",
            this._startListeners,
            this._endListeners,
          );
        }

        entry.action._initAnimator({ subject: entity });
        entry.action.onActionStart({ subject: entity });
        if (entry.key) {
          this._fireListeners(this._startListeners, entry.key);
        }

        this._tickEntry(entry, entity, deltaMs);
      }
    }

    // Fire behavior-end callbacks once the entire behavior is done
    if (this.isDone && !this._behaviorEndFired) {
      this._behaviorEndFired = true;
      for (const cb of this._behaviorEndListeners) {
        cb();
      }
    }

    // Fire progress callbacks
    if (this._progressCallbacks.length > 0) {
      const totalDuration = this.getDuration();
      const progress =
        totalDuration > 0 ? Math.min(this._elapsedMs / totalDuration, 1) : 1;

      const keep = [];
      for (const cb of this._progressCallbacks) {
        const remove = cb({ progress, elapsed: this._elapsedMs });
        if (!remove) {
          keep.push(cb);
        }
      }
      this._progressCallbacks = keep;
    }
  }

  /**
   * Tick a single active schedule entry once, retiring it (firing `onActionEnd`
   * and any end listeners) if it completes.
   */
  private _tickEntry(
    entry: ScheduleEntry<Subject>,
    subject: Subject,
    deltaMs: number,
  ): void {
    entry.action._internalTick({ subject, deltaMs });
    if (entry.action.isDone) {
      entry.active = false;
      entry.action.onActionEnd({ subject });
      if (entry.key) {
        this._fireListeners(this._endListeners, entry.key);
      }
    }
  }

  /** Pre-compute the listener key for every action in the chain. */
  private _computeActionKeys(): string[] {
    const counters = new Map<string, number>();
    return this._actions.map((action) => {
      const name = action.name;
      const idx = counters.get(name) ?? 0;
      counters.set(name, idx + 1);
      return `${this._prefix}${name}[${idx}]`;
    });
  }

  /**
   * Collect every valid key, recursing into sub-behaviors so that nested
   * action keys are also recognised.
   */
  private _collectValidKeys(
    actions: Action<Subject>[],
    prefix: string,
    into: Set<string>,
  ): void {
    const counters = new Map<string, number>();
    for (const action of actions) {
      const name = action.name;
      const idx = counters.get(name) ?? 0;
      counters.set(name, idx + 1);
      const key = `${prefix}${name}[${idx}]`;
      into.add(key);
      if (action instanceof Behavior) {
        this._collectValidKeys(
          (action as any)._actions as Action<Subject>[],
          key + ".",
          into,
        );
      }
    }
  }

  private _fireListeners(
    map: Map<string, ActionCallback[]>,
    key: string,
  ): void {
    const callbacks = map.get(key);
    if (callbacks) {
      for (const cb of callbacks) {
        cb();
      }
    }
  }
}
