import { Action } from "../utils/behavior";
import { CharAction } from "../utils/character";

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
    super({ name, duration });
    this._action = action;
  }

  public override onStart({ subject }: { subject: Subject }): void {
    this._origAction = subject.action;
    subject.setAction(this._action, this.duration);
  }

  public override onEnd({ subject }: { subject: Subject }): void {
    subject.setAction(this._origAction!);
  }
}
