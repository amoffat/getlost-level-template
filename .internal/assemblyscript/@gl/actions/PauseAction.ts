import { Action, type BehaviorParams, type Entity } from "../utils/behavior";

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

  public tick({
    delta,
  }: {
    subject: Entity;
    delta: number;
    params: BehaviorParams;
  }): boolean {
    this.elapsed += delta;
    if (this.elapsed >= this.duration) {
      return true;
    }
    return false;
  }
}
