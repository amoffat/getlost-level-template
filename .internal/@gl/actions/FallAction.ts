import { Action } from "@gl/utils/behavior";
import { Easings } from "@gl/utils/easing";
import { Vec2 } from "@gl/utils/vec2";

interface Subject {
  getScale(): number;
  setScale(size: number): void;
  setRotation(radians: number): void;
  getAlpha(): number;
  setAlpha(alpha: number): void;
  setVisibility(visible: boolean): void;
}

/**
 * A behavior for a character falling down a well or pit.
 */
export class FallAction extends Action<Subject> {
  private readonly _direction: Vec2;
  private readonly _spinDir: 1 | -1;

  private _initialScale = 0;
  private _initialAlpha = 0;
  private _initialRotation = 0;
  private _spinRate: number;

  constructor({
    name = "fall",
    direction,
    duration,
    spinRate = 0.005,
  }: {
    name?: string;
    direction: Vec2;
    duration: number;
    /** In radians per ms */
    spinRate?: number;
  }) {
    super({ name, durationMs: duration, easing: Easings.easeInQuad });
    this._direction = direction;
    this._spinDir = Math.random() < 0.5 ? 1 : -1;
    this._spinRate = spinRate;
  }

  public override onStart({ subject }: { subject: Subject }): void {
    this._initialScale = subject.getScale();
    this._initialAlpha = subject.getAlpha();

    // The rotation will start as the direction that the subject is falling. We
    // don't care about any initial rotation.
    this._initialRotation = this._direction.angle;
    subject.setRotation(this._direction.angle);
  }

  public override onEnd({ subject }: { subject: Subject }): void {
    subject.setVisibility(false);
  }

  public override tick({
    subject,
    progress,
    elapsed,
  }: {
    subject: Subject;
    progress: number;
    elapsed: number;
  }): void {
    subject.setScale(this._initialScale * (1 - progress));
    subject.setAlpha(this._initialAlpha * (1 - progress));
    subject.setRotation(
      this._initialRotation + this._spinDir * this._spinRate * elapsed,
    );
  }
}
