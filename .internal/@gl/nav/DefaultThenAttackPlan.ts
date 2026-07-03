import type { Character } from "@gl/utils/character";
import { Vec2 } from "@gl/utils/vec2";
import { Waypoint } from "@gl/utils/waypoint";
import { AggressiveBasePlan } from "./AggressiveBasePlan";
import { NavPlan } from "./NavPlan";

export class DefaultThenAttackPlan extends AggressiveBasePlan {
  private _default: NavPlan;

  constructor({
    defaultPlan,
    target,
    attackDistance,
  }: {
    defaultPlan: NavPlan;
    target: Character;
    attackDistance: number;
  }) {
    super({ target, attackDistance });
    this._default = defaultPlan;
  }

  protected override async _defaultWaypoint(
    curPos: Vec2,
  ): Promise<Waypoint | null> {
    const wp = await this._default.getNextWaypoint(curPos);
    if (wp) {
      wp.nearestIsOk = true;
    }
    return wp;
  }
}
