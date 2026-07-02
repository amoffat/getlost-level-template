import { CharAction } from "@gl/types/character";
import { Action } from "@gl/utils/behavior";

interface Subject {
  getAction(): CharAction;
  getSpeed(): number;
  setSpeed(speed: number): void;
  setAction(newAction: CharAction, duration?: number): void;
}

export class SpriteChangeAction extends Action<Subject> {
  private readonly _action: CharAction;
  private readonly _speed: number;
  private _origAction: CharAction | null = null;
  private _origSpeed: number | null = null;

  constructor({
    name = "spriteChange",
    action,
    duration,
    speed = 1.0,
  }: {
    name?: string;
    action: CharAction;
    speed?: number;
    duration: number;
  }) {
    super({ name, durationMs: duration });
    this._action = action;
    this._speed = speed;
  }

  public override onStart({ subject }: { subject: Subject }): void {
    this._origAction = subject.getAction();
    subject.setAction(this._action, this.durationMs);
    this._origSpeed = subject.getSpeed();
    subject.setSpeed(this._speed);
  }

  public override onEnd({ subject }: { subject: Subject }): void {
    subject.setAction(this._origAction!);
    subject.setSpeed(this._origSpeed!);
  }
}
