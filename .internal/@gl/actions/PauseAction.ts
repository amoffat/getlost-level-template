import { Action } from "../utils/behavior";

export class PauseAction extends Action<unknown> {
  constructor({
    name = "pause",
    duration,
  }: {
    name?: string;
    duration: number;
  }) {
    super({ name, duration });
  }
}
