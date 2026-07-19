import { Action } from "@gl/utils/behavior";

interface Subject {
  setColorOverlay(color: number, alpha: number): void;
}

export class ColorFadeAction extends Action<Subject> {
  private readonly _color: number;
  private readonly _alpha: number;

  /**
   * @param color  Color vector applied to the subject.
   * @param alpha  Alpha value applied to the subject.
   */
  constructor({
    name = "color",
    color,
    alpha = 1,
    durationMs = 0,
  }: {
    name?: string;
    color: number;
    alpha?: number;
    durationMs?: number;
  }) {
    super({ name, durationMs });
    this._color = color;
    this._alpha = alpha;
  }

  public override onActionStart({ subject }: { subject: Subject }): void {
    subject.setColorOverlay(this._color, this._alpha);
  }

  public override onActionEnd({ subject }: { subject: Subject }): void {
    subject.setColorOverlay(this._color, 0);
  }

  public override tick({
    subject,
    progress,
  }: {
    subject: Subject;
    progress: number;
  }): void {
    const alpha = 1.0 - progress;
    subject.setColorOverlay(this._color, alpha);
  }
}
