import { Action } from "../utils/behavior";
import { Easings } from "../utils/easing";

interface Subject {
  setAlpha(alpha: number): void;
}

export class AlphaOscillateAction extends Action<Subject> {
  private readonly _cycles: number;

  constructor({
    name = "alphaOscillate",
    duration,
    cycles,
    easing = Easings.linear,
  }: {
    name?: string;
    duration: number;
    cycles: number;
    easing?: (t: number) => number;
  }) {
    super({ name, duration, easing });
    this._cycles = cycles;
  }

  public override onEnd({ subject }: { subject: Subject }): void {
    subject.setAlpha(1);
  }

  public override tick({
    subject,
    progress,
  }: {
    subject: Subject;
    progress: number;
  }): void {
    // cos^2 can start on 1 (full alpha) and end on 1
    const cos = Math.cos(progress * this._cycles * Math.PI);
    const alpha = cos * cos;
    subject.setAlpha(alpha);
  }
}
