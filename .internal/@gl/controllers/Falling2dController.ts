import * as char from "@gl/api/char";
import type { Character } from "@gl/utils/character";
import { CharacterController } from "./CharacterController";

// Gravitational acceleration while falling (pixels per second squared).
export const fallingGravity = 500;

/**
 * Drives a character straight down under gravity while preserving its current
 * horizontal velocity. Falling is open-ended: it continues until the caller
 * detaches the controller.
 */
export class Falling2dController extends CharacterController {
  public name = "Falling2d";
  private _fallVelocity: number;

  constructor({ startVelocity = 0 }: { startVelocity?: number } = {}) {
    super();
    this._fallVelocity = startVelocity;
  }

  onAttach(character: Character): void {
    // Cancel any in-progress jump so it stops overriding _pos and _velocity
    // every tick. Without this, JumpAction keeps calling setPos() each frame,
    // resetting _pos to the jump's linear-interpolation endpoint — which
    // diverges from the falling-physics position and produces a visible
    // snap/bump when the jump animation finishes.
    character.cancelActiveJump();
    char.setShadow(character.id, false);
  }

  tick(deltaMs: number, character: Character): void {
    const dtSec = deltaMs / 1000;
    const pos = character.getPos();
    pos.x += character.getVelocity().x * dtSec;
    this._fallVelocity += fallingGravity * dtSec;
    pos.y += this._fallVelocity * dtSec;
    character.setPos(pos);
  }
}
