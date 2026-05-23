import { Action } from "@gl/utils/behavior";
import { Vec2 } from "@gl/utils/vec2";

interface Subject {
  addImpulse(impulse: Vec2): void;
}

export class DashAction extends Action<Subject> {
  private readonly _direction: Vec2;

  /**
   * @param direction  Impulse vector applied to the subject (direction and magnitude).
   */
  constructor({
    name = "dash",
    direction,
    duration = 0,
  }: {
    name?: string;
    direction: Vec2;
    duration?: number;
  }) {
    super({ name, durationMs: duration });
    this._direction = direction;
  }

  public override onStart({ subject }: { subject: Subject }): void {
    subject.addImpulse(this._direction);
  }
}
