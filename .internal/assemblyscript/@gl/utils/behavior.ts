import { type Vector } from "../api/types/vector";
import { globalTicker } from "../ticker";

export interface Entity {
  getPos: () => Vector;
  setPos: (x: number, y: number) => void;
}

export type ActionCallback = () => void;

/**
 * A bag of key→value parameters forwarded to every {@link Action.tick} call
 * when a {@link Behavior} is performed.  Actions can query these at
 * perform-time to adjust their logic (e.g. a DashAction reading a
 * `"target"` parameter to change dash direction).
 */
export type BehaviorParams = Record<string, unknown>;

export abstract class Action<Params extends object = BehaviorParams> {
  /**
   * A unique identifier for this type of action, used as part of the key
   * when registering listeners on a {@link BehaviorInProgress}.
   */
  abstract get name(): string;

  /**
   * @param subject The subject to operate on
   * @param delta The timestep in ms
   * @param params Perform-time parameters supplied via {@link Behavior.performOn}
   * @return Whether the behavior is complete and should transition to the next one
   */
  abstract tick(args: {
    subject: Entity;
    delta: number;
    params: Params;
  }): boolean;
}

export class Behavior extends Action {
  private _name: string;
  private actions: Action[] = [];
  private sideActions: Map<number, Action[]> = new Map();
  private inProgress: BehaviorInProgress | null = null;

  // Listener context forwarded from a parent BehaviorInProgress
  private _listenerPrefix: string = "";
  private _startListeners: Map<string, ActionCallback[]> | null = null;
  private _endListeners: Map<string, ActionCallback[]> | null = null;

  constructor(name: string) {
    super();
    this._name = name;
  }

  public get name(): string {
    return this._name;
  }

  public then(...actions: Action[]): Behavior {
    this.actions.push(...actions);
    return this;
  }

  /**
   * Runs the given actions concurrently alongside the previously chained action.
   * The side actions start when the preceding action starts and do not block it.
   */
  public also(...actions: Action[]): Behavior {
    const prevIndex = this.actions.length - 1;
    if (!this.sideActions.has(prevIndex)) {
      this.sideActions.set(prevIndex, []);
    }
    this.sideActions.get(prevIndex)!.push(...actions);
    return this;
  }

  /**
   * @internal Called by a parent {@link BehaviorInProgress} to forward its
   * listener maps so that actions inside this sub-behavior can fire
   * callbacks registered on the root.
   */
  _setListenerContext(
    prefix: string,
    startListeners: Map<string, ActionCallback[]>,
    endListeners: Map<string, ActionCallback[]>,
  ): void {
    this._listenerPrefix = prefix;
    this._startListeners = startListeners;
    this._endListeners = endListeners;
  }

  public tick({
    subject,
    delta,
    params,
  }: {
    subject: Entity;
    delta: number;
    params: BehaviorParams;
  }): boolean {
    if (this.inProgress === null) {
      this.inProgress = new BehaviorInProgress({
        entity: subject,
        actions: this.actions,
        sideActions: this.sideActions,
        prefix: this._listenerPrefix,
        params,
      });
    }
    this.inProgress.tick(delta);
    if (this.inProgress.isDone) {
      this.inProgress = null;
      return true;
    }
    return false;
  }

  public performOn(
    entity: Entity,
    params: BehaviorParams = {},
  ): BehaviorInProgress {
    const bip = new BehaviorInProgress({
      entity,
      actions: this.actions,
      sideActions: this.sideActions,
      params,
    });
    const tick = (delta: number) => bip.tick(delta);
    globalTicker.subscribe(tick);
    bip.onBehaviorEnd(() => {
      globalTicker.unsubscribe(tick);
    });
    return bip;
  }
}

export class BehaviorInProgress {
  private entity: Entity;
  private actions: Action[];
  private sideActions: Map<number, Action[]>;
  private currentIndex: number = 0;
  private firedSidesForIndex: number = -1;
  private backgroundActions: Action[] = [];
  private prefix: string;
  private startListeners: Map<string, ActionCallback[]> = new Map();
  private endListeners: Map<string, ActionCallback[]> = new Map();
  private actionKeys: string[];
  private validKeys: Set<string>;
  private behaviorEndListeners: ActionCallback[] = [];
  private behaviorEndFired: boolean = false;
  private params: BehaviorParams;

  constructor({
    entity,
    actions,
    sideActions = new Map(),
    prefix = "",
    params = {},
  }: {
    entity: Entity;
    actions: Action[];
    sideActions?: Map<number, Action[]>;
    prefix?: string;
    params?: BehaviorParams;
  }) {
    this.entity = entity;
    this.actions = actions;
    this.sideActions = sideActions;
    this.prefix = prefix;
    this.params = params;
    this.actionKeys = this.computeActionKeys();
    this.validKeys = new Set<string>();
    this.collectValidKeys(this.actions, this.prefix, this.validKeys);
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
    if (!this.validKeys.has(key)) {
      console.error(
        `onActionStart: key "${key}" does not match any action. ` +
          `Valid keys: ${[...this.validKeys].join(", ")}`,
      );
      return this;
    }
    if (!this.startListeners.has(key)) {
      this.startListeners.set(key, []);
    }
    this.startListeners.get(key)!.push(callback);
    return this;
  }

  /**
   * Registers a callback to be invoked when the action identified by `key`
   * completes (its tick returns `true`).
   *
   * Keys use the format `name[idx]` where `name` is the action's
   * {@link Action.name} and `idx` is its zero-based occurrence index among
   * actions sharing that name in the chain.
   *
   * For actions inside a sub-behavior, extend the key with a dot:
   * `behaviorName[idx].actionName[subIdx]`.
   */
  /**
   * Registers a callback to be invoked once when the entire behavior
   * finishes (all sequential and background actions are complete).
   */
  public onBehaviorEnd(callback: ActionCallback): this {
    this.behaviorEndListeners.push(callback);
    return this;
  }

  public onActionEnd(key: string, callback: ActionCallback): this {
    if (!this.validKeys.has(key)) {
      console.error(
        `onActionEnd: key "${key}" does not match any action. ` +
          `Valid keys: ${[...this.validKeys].join(", ")}`,
      );
      return this;
    }
    if (!this.endListeners.has(key)) {
      this.endListeners.set(key, []);
    }
    this.endListeners.get(key)!.push(callback);
    return this;
  }

  public get isDone(): boolean {
    return (
      this.currentIndex >= this.actions.length &&
      this.backgroundActions.length === 0
    );
  }

  public tick(delta: number): void {
    // Tick background (also) actions, removing completed ones
    this.backgroundActions = this.backgroundActions.filter(
      (action) =>
        !action.tick({ subject: this.entity, delta, params: this.params }),
    );

    if (this.currentIndex >= this.actions.length) return;

    // On the first tick of a new main action, fire its also-side actions
    if (this.currentIndex !== this.firedSidesForIndex) {
      this.firedSidesForIndex = this.currentIndex;

      // If this action is a sub-behavior, forward listener context so its
      // internal BehaviorInProgress can fire callbacks registered on the root.
      const currentAction = this.actions[this.currentIndex]!;
      if (currentAction instanceof Behavior) {
        currentAction._setListenerContext(
          this.actionKeys[this.currentIndex] + ".",
          this.startListeners,
          this.endListeners,
        );
      }

      // Fire start listeners for this action
      this.fireListeners(
        this.startListeners,
        this.actionKeys[this.currentIndex]!,
      );

      const sides = this.sideActions.get(this.currentIndex);
      if (sides) {
        for (const side of sides) {
          if (
            !side.tick({ subject: this.entity, delta, params: this.params })
          ) {
            this.backgroundActions.push(side);
          }
        }
      }
    }

    // Tick the main sequential action
    const action = this.actions[this.currentIndex]!;
    const complete = action.tick({
      subject: this.entity,
      delta,
      params: this.params,
    });
    if (complete) {
      // Fire end listeners for this action
      this.fireListeners(
        this.endListeners,
        this.actionKeys[this.currentIndex]!,
      );
      this.currentIndex++;
    }

    // Fire behavior-end callbacks once the entire behavior is done
    if (this.isDone && !this.behaviorEndFired) {
      this.behaviorEndFired = true;
      for (const cb of this.behaviorEndListeners) {
        cb();
      }
    }
  }

  /** Pre-compute the listener key for every action in the chain. */
  private computeActionKeys(): string[] {
    const counters = new Map<string, number>();
    return this.actions.map((action) => {
      const name = action.name;
      const idx = counters.get(name) ?? 0;
      counters.set(name, idx + 1);
      return `${this.prefix}${name}[${idx}]`;
    });
  }

  /**
   * Collect every valid key, recursing into sub-behaviors so that nested
   * action keys are also recognised.
   */
  private collectValidKeys(
    actions: Action[],
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
        this.collectValidKeys(
          (action as any).actions as Action[],
          key + ".",
          into,
        );
      }
    }
  }

  private fireListeners(map: Map<string, ActionCallback[]>, key: string): void {
    const callbacks = map.get(key);
    if (callbacks) {
      for (const cb of callbacks) {
        cb();
      }
    }
  }
}
