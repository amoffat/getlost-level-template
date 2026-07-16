import { Action } from "@gl/utils/behavior";
import { Easings } from "@gl/utils/easing";

interface Subject {
  getAlpha(): number;
  setAlpha(alpha: number): void;
}

export class AlphaOscillateAction extends Action<Subject> {
  private readonly _cycles: number;
  private readonly _startAlpha: number;

  constructor({
    name = "alphaOscillate",
    durationMs,
    cycles,
    startAlpha = 1,
    easing = Easings.linear,
  }: {
    name?: string;
    durationMs: number;
    cycles: number;
    startAlpha?: number;
    easing?: (t: number) => number;
  }) {
    super({ name, durationMs, easing });
    this._cycles = cycles;
    this._startAlpha = startAlpha;
  }

  public override onActionEnd({ subject }: { subject: Subject }): void {
    subject.setAlpha(this._startAlpha);
  }

  public override tick({
    subject,
    progress,
  }: {
    subject: Subject;
    progress: number;
  }): void {
    // cos^2 oscillates between 0 and 1, starting and ending at 1. Scaling by
    // _startAlpha shifts the peak to match the subject's resting alpha.
    const cos = Math.cos(progress * this._cycles * Math.PI);
    subject.setAlpha(this._startAlpha * cos * cos);
  }
}

export class FadeInAction extends Action<Subject> {
  private _startAlpha: number = 0;

  constructor({
    name = "fadeIn",
    durationMs,
    easing = Easings.linear,
  }: {
    name?: string;
    durationMs: number;
    easing?: (t: number) => number;
  }) {
    super({ name, durationMs, easing });
  }

  public override onActionStart({ subject }: { subject: Subject }): void {
    this._startAlpha = subject.getAlpha();
  }

  public override onActionEnd({ subject }: { subject: Subject }): void {
    subject.setAlpha(1);
  }

  public override tick({
    subject,
    progress,
  }: {
    subject: Subject;
    progress: number;
  }): void {
    subject.setAlpha(this._startAlpha + (1 - this._startAlpha) * progress);
  }
}

export class FadeOutAction extends Action<Subject> {
  private _startAlpha: number = 1;

  constructor({
    name = "fadeOut",
    durationMs,
    easing = Easings.linear,
  }: {
    name?: string;
    durationMs: number;
    easing?: (t: number) => number;
  }) {
    super({ name, durationMs, easing });
  }

  public override onActionStart({ subject }: { subject: Subject }): void {
    this._startAlpha = subject.getAlpha();
  }

  public override onActionEnd({ subject }: { subject: Subject }): void {
    subject.setAlpha(0);
  }

  public override tick({
    subject,
    progress,
  }: {
    subject: Subject;
    progress: number;
  }): void {
    subject.setAlpha(this._startAlpha * (1 - progress));
  }
}
