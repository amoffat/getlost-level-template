import type { Character } from "@gl/utils/character";
import { Easings } from "@gl/utils/easing";
import { chance } from "@gl/utils/rand";
import { Vec2 } from "@gl/utils/vec2";
import { Waypoint } from "@gl/utils/waypoint";
import { AggressiveBasePlan } from "./AggressiveBasePlan";

export class RandomThenAttackPlan extends AggressiveBasePlan {
  private _randMoveDistance: number;

  constructor({
    target,
    attackDistance,
    randMoveDistance,
  }: {
    target: Character;
    attackDistance: number;
    randMoveDistance: number;
  }) {
    super({ target, attackDistance });
    this._randMoveDistance = randMoveDistance;
  }

  // Gives the player a chance to escape, if we're right on top of them,
  // there's a high chance that we'll choose a default waypoint instead.
  protected _shouldAttack(curPos: Vec2): boolean {
    const nd = this._normDistance(curPos);
    return chance(Easings.easeOutCircle(nd));
  }

  protected override async _defaultWaypoint(
    curPos: Vec2,
  ): Promise<Waypoint | null> {
    const wp = this._randomInCircle(curPos, this._randMoveDistance);
    return wp;
  }
}
