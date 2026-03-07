import { Action, type Entity } from "../utils/behavior";

export class PauseAction extends Action {
  private readonly _name: string;

  public get name(): string {
    return this._name;
  }

  private duration: number;
  private elapsed: number = 0;

  constructor({
    name = "pause",
    duration,
  }: {
    name?: string;
    duration: number;
  }) {
    super();
    this._name = name;
    this.duration = duration;
  }

  public tick(_subject: Entity, delta: number): boolean {
    this.elapsed += delta;
    if (this.elapsed >= this.duration) {
      return true;
    }
    return false;
  }
}
