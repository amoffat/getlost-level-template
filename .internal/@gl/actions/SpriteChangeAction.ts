import { Action } from "@gl/utils/behavior";

interface Subject {
  pushCustomAction(opts: {
    action: string;
    durationMs?: number;
    speed?: number;
  }): number;
  popCustomAction(id?: number): void;
}

export class SpriteChangeAction extends Action<Subject> {
  private readonly _action: string;
  private readonly _speed: number;
  private _handle: number | null = null;

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
    this._handle = subject.pushCustomAction({
      action: this._action,
      durationMs: this.durationMs,
      speed: this._speed,
    });
  }

  public override onActionEnd({ subject }: { subject: Subject }): void {
    if (this._handle != null) {
      subject.popCustomAction(this._handle);
      this._handle = null;
    }
  }
}
