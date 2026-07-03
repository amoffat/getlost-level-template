import * as navigation from "@gl/api/navigation";

import { inCircle } from "@gl/utils/rand";
import { Vec2 } from "@gl/utils/vec2";
import { Waypoint } from "@gl/utils/waypoint";

export const tryToFindValid: number = 10;

export abstract class NavPlan {
  public name: string = "";

  public abstract getNextWaypoint(curPos: Vec2): Promise<Waypoint | null>;
  public hasNextWaypoint(_curPos: Vec2): boolean {
    return true;
  }

  public tick(_deltaMS: number, _curPos: Vec2): Promise<boolean> {
    return Promise.resolve(false);
  }

  protected async _checkValid(
    start: Vec2,
    end: Vec2,
    nearestIsOk: boolean,
    lengthBound?: number,
  ): Promise<boolean> {
    const path = await navigation.findPath({
      startPos: start.toVector(),
      endPos: end.toVector(),
      nearestIsOk,
      max: lengthBound,
    });
    const hasPath = path.length > 0;
    return hasPath;
  }

  protected _pathLength(path: Vec2[]): number {
    let len: number = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i]!;
      const b = path[i + 1]!;
      len += a.distanceTo(b);
    }
    return len;
  }

  protected async _randomInCircle(
    curPos: Vec2,
    maxDistance: number,
  ): Promise<Waypoint | null> {
    for (let i = 0; i < tryToFindValid; i++) {
      const rndPos = inCircle(maxDistance);
      const candPos = curPos.added(rndPos);
      if (await this._checkValid(curPos, candPos, true, maxDistance)) {
        const wp = new Waypoint(candPos.toVector());
        wp.nearestIsOk = true;
        return wp;
      }
    }
    return null;
  }
}
