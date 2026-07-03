import type { Character } from "@gl/utils/character";

/**
 * A controller positions a character precisely each tick, taking precedence
 * over the character's automatic (MovementManager) movement. While a controller
 * is attached, `Character.tick` delegates positioning to it and skips the
 * normal walking/pathfinding logic.
 *
 * Mirrors the lifecycle patterns used by `NavPlan` (@gl/nav) and `Action`
 * (@gl/utils/behavior): construct with configuration, then react to lifecycle
 * callbacks.
 */
export abstract class CharacterController {
  public name: string = "";

  /** Called once when attached, before the first tick. */
  onAttach(_character: Character): void {}

  /** Called every frame while attached; mutate the character's position here. */
  abstract tick(deltaMs: number, character: Character): void;

  /** Called once when detached (self-completed or explicit). */
  onDetach(_character: Character): void {}

  /** When true, Character auto-detaches after the current tick. */
  get isDone(): boolean {
    return false;
  }
}
