import { Vector2 } from "@gl/types/api/vector";
import { Action } from "@gl/utils/behavior";
import { Vec2 } from "@gl/utils/vec2";

interface Subject {
  setTargetPos(args: {
    targetPos: Vec2;
    speed?: number;
    durationMs?: number;
  }): void;
}

/**
 * Moves the subject to a target position via its NavManager (following a
 * pathfound route around obstacles), arriving within `duration` ms. The nav
 * drives the character at the exact velocity needed to cover the remaining
 * path in the remaining time, bypassing the normal maxVelocity cap.
 */
export class MoveAction extends Action<Subject> {
  private readonly _target: Vec2;

  constructor({
    name = "move",
    target,
    durationMs,
  }: {
    name?: string;
    target: Vector2;
    durationMs: number;
  }) {
    super({ name, durationMs });
    this._target = Vec2.fromVector2(target);
  }

  public override onActionStart({ subject }: { subject: Subject }): void {
    subject.setTargetPos({
      targetPos: this._target,
      durationMs: this.durationMs,
    });
  }
}
