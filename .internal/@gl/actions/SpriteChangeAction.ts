import { Action } from "@gl/utils/behavior";

interface Subject {
  getAction(): string;
  getSpeed(): number;
  setSpeed(speed: number): void;
  setAction(newAction: string): void;
}

export class SpriteChangeAction extends Action<Subject> {
  private readonly _action: string;
  private readonly _speed: number;
  private _origAction: string | null = null;
  private _origSpeed: number | null = 1.0;

  constructor({
    name = "spriteChange",
    action,
    durationMs,
    speed = 1.0,
  }: {
    name?: string;
    action: string;
    speed?: number;
    durationMs: number;
  }) {
    super({ name, durationMs });
    this._action = action;
    this._speed = speed;
  }

  public override onActionStart({ subject }: { subject: Subject }): void {
    this._origAction = subject.getAction();
    subject.setAction(this._action);
    this._origSpeed = subject.getSpeed();
    subject.setSpeed(this._speed);
  }

  public override onActionEnd({ subject }: { subject: Subject }): void {
    subject.setAction(this._origAction!);
    subject.setSpeed(this._origSpeed!);
  }
}
