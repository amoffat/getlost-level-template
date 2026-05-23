import { CharAction } from "@gl/types/character";
import { Action } from "@gl/utils/behavior";

interface Subject {
  get action(): CharAction;
  setAction(newAction: CharAction, duration?: number): void;
}

export class SpriteChangeAction extends Action<Subject> {
  private readonly _action: CharAction;
  private _origAction: CharAction | null = null;

  constructor({
    name = "spriteChange",
    action,
    duration,
  }: {
    name?: string;
    action: CharAction;
    duration: number;
  }) {
    super({ name, durationMs: duration });
    this._action = action;
  }

  public override onStart({ subject }: { subject: Subject }): void {
    this._origAction = subject.action;
    subject.setAction(this._action, this.durationMs);
  }

  public override onEnd({ subject }: { subject: Subject }): void {
    subject.setAction(this._origAction!);
  }
}
