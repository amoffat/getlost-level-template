import { globalTicker } from "@gl/ticker";
import { Animator } from "./animation";
import { Easings, type EasingFunction } from "./easing";

export type ActionCallback = () => void;

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
   * @internal Called by {@link Behavior} before {@link onStart} to
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
  onStart(_args: { subject: Subject }): void {}

  /**
   * Called once when this action completes.
   */
  onEnd(_args: { subject: Subject }): void {}
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
export class Behavior<Subject> extends Action<Subject> {
  // Build-time state
  private _actions: Action<Subject>[] = [];
  private _sideActions: Map<number, Action<Subject>[]> = new Map();

  // Execution state (initialised in onStart)
  private _subject: Subject;
  private _started: boolean = false;
  private _currentIndex: number = 0;
  private _firedSidesForIndex: number = -1;
  private _backgroundActions: Action<Subject>[] = [];

  // Listener state
  private _prefix: string = "";
  private _startListeners: Map<string, ActionCallback[]> = new Map();
  private _endListeners: Map<string, ActionCallback[]> = new Map();
  private _actionKeys: string[] = [];
  private _validKeys: Set<string> = new Set();
  private _behaviorEndListeners: ActionCallback[] = [];
  private _behaviorEndFired: boolean = false;

  constructor(name: string, subject: Subject) {
    super({ name, durationMs: 0 });
    this._subject = subject;
  }

  /** @internal Behavior manages its own lifecycle; no animator needed. */
  override _initAnimator(): void {}

  override get isDone(): boolean {
    return (
      this._started &&
      this._currentIndex >= this._actions.length &&
      this._backgroundActions.length === 0
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
    this._actions.push(...actions);
    return this;
  }

  /**
   * Runs the given actions concurrently alongside the previously chained action.
   * The side actions start when the preceding action starts and do not block it.
   */
  public also(...actions: Action<Subject>[]): Behavior<Subject> {
    const prevIndex = this._actions.length - 1;
    if (!this._sideActions.has(prevIndex)) {
      this._sideActions.set(prevIndex, []);
    }
    this._sideActions.get(prevIndex)!.push(...actions);
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
  public override onStart({ subject }: { subject: Subject }): void {
    if (this._started) {
      throw new Error(
        `Behavior "${this._name}" can only be used once. Create a new instance to perform it again.`,
      );
    }
    this._started = true;
    this._subject = subject;
    this._actionKeys = this._computeActionKeys();
    this._collectValidKeys(this._actions, this._prefix, this._validKeys);
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
  public onActionStart(key: string, callback: ActionCallback): this {
    if (!this._validKeys.has(key)) {
      console.error(
        `onActionStart: key "${key}" does not match any action. ` +
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
  public onActionEnd(key: string, callback: ActionCallback): this {
    if (!this._validKeys.has(key)) {
      console.error(
        `onActionEnd: key "${key}" does not match any action. ` +
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

  public perform(): Behavior<Subject> {
    this.onStart({ subject: this._subject });
    const tick = (deltaMs: number) => this._tickBehavior(deltaMs);
    globalTicker.subscribe(tick);
    this.onBehaviorEnd(() => {
      globalTicker.unsubscribe(tick);
    });
    return this;
  }

  private _tickBehavior(deltaMs: number): void {
    const entity = this._subject!;

    // Tick background (also) actions, removing completed ones
    this._backgroundActions = this._backgroundActions.filter((entry) => {
      entry._internalTick({ subject: entity, deltaMs });
      if (entry.isDone) {
        entry.onEnd({ subject: entity });
        return false;
      }
      return true;
    });

    if (this._currentIndex < this._actions.length) {
      // On the first tick of a new main action, fire its also-side actions
      if (this._currentIndex !== this._firedSidesForIndex) {
        this._firedSidesForIndex = this._currentIndex;

        // If this action is a sub-behavior, forward listener context so its
        // actions can fire callbacks registered on the root.
        const currentAction = this._actions[this._currentIndex]!;
        if (currentAction instanceof Behavior) {
          currentAction._setListenerContext(
            this._actionKeys[this._currentIndex] + ".",
            this._startListeners,
            this._endListeners,
          );
        }

        // Start the action's internal animator, then notify it
        currentAction._initAnimator({ subject: entity });
        currentAction.onStart({ subject: entity });

        // Fire start listeners for this action
        this._fireListeners(
          this._startListeners,
          this._actionKeys[this._currentIndex]!,
        );

        const sides = this._sideActions.get(this._currentIndex);
        if (sides) {
          for (const side of sides) {
            side._initAnimator({ subject: entity });
            side.onStart({ subject: entity });
            side._internalTick({ subject: entity, deltaMs });
            if (side.isDone) {
              side.onEnd({ subject: entity });
            } else {
              this._backgroundActions.push(side);
            }
          }
        }
      }

      const action = this._actions[this._currentIndex]!;
      action._internalTick({ subject: entity, deltaMs });
      if (action.isDone) {
        action.onEnd({ subject: entity });
        this._fireListeners(
          this._endListeners,
          this._actionKeys[this._currentIndex]!,
        );
        this._currentIndex++;
      }
    }

    // Fire behavior-end callbacks once the entire behavior is done
    if (this.isDone && !this._behaviorEndFired) {
      this._behaviorEndFired = true;
      for (const cb of this._behaviorEndListeners) {
        cb();
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
