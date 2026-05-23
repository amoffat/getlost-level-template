import { Action } from "@gl/utils/behavior";
import { Easings } from "@gl/utils/easing";

export interface WavyParams {
  strength: number;
  frequency: number;
  phase: number;
}

interface Subject {
  setWavy(params: Partial<WavyParams>): void;
}

type ActionParams = Omit<WavyParams, "phase"> & { speed: number };

export class WavyAction extends Action<Subject> {
  private readonly _params: ActionParams;

  /**
   * @param color  Color vector applied to the subject.
   * @param alpha  Alpha value applied to the subject.
   */
  constructor({
    name = "wavy",
    durationMs = 1000,
    params,
  }: {
    name?: string;
    durationMs?: number;
    params: ActionParams;
  }) {
    super({ name, durationMs, easing: Easings.easeOutQuad });
    this._params = params;
  }

  public override onStart({ subject }: { subject: Subject }): void {
    subject.setWavy(this._params);
  }

  public override onEnd({ subject }: { subject: Subject }): void {
    subject.setWavy({ strength: 0 });
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
    const seconds = elapsed / 1000;
    const phase = seconds * this._params.speed * Math.PI * 2;
    const strength = (1 - progress) * this._params.strength;
    subject.setWavy({ ...this._params, phase, strength });
  }
}
