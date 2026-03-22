import { Action } from "@gl/utils/behavior";

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
