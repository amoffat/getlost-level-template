import { Action } from "@gl/utils/behavior";
import { Vec2 } from "@gl/utils/vec2";

import { Easings, type EasingFunction } from "@gl/utils/easing";

interface Subject {
  addImpulse(impulse: Vec2): void;
  getPos(): Vec2;
  setPos(pos: Vec2): void;
}

export class DashAction extends Action<Subject> {
  private readonly _direction: Vec2;

  /**
   * @param direction  Impulse vector applied to the subject (direction and magnitude).
   */
  constructor({
    name = "dash",
    direction,
    durationMs = 0,
  }: {
    name?: string;
    direction: Vec2;
    durationMs?: number;
  }) {
    super({ name, durationMs });
    this._direction = direction;
  }

  public override onActionStart({ subject }: { subject: Subject }): void {
    subject.addImpulse(this._direction);
  }
}

export class DashPosAction extends Action<Subject> {
  private readonly _target: Vec2;
  private _startPos: Vec2 = Vec2.zero();

  constructor({
    name = "dashPos",
    target,
    durationMs,
    easing = Easings.easeOutQuad,
  }: {
    name?: string;
    target: Vec2;
    durationMs: number;
    easing?: EasingFunction;
  }) {
    super({ name, durationMs, easing });
    this._target = target;
  }

  public override onActionStart({ subject }: { subject: Subject }): void {
    this._startPos = subject.getPos().clone();
  }

  public override tick({
    subject,
    progress,
  }: {
    subject: Subject;
    progress: number;
    elapsed: number;
  }): void {
    subject.setPos(this._startPos.lerped(this._target, progress));
  }
}
