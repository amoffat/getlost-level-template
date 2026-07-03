import { CharacterController } from "./CharacterController";

/**
 * Causes the character to have no driving movement whatsoever. Effectively
 * overrides the character's navigation manager.
 */
export class DoNothingController extends CharacterController {
  public name = "DoNothing";

  tick(): void {}
}
