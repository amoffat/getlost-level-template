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
    // No `id`: candidate probes are intentionally un-debounced. Grouping the
    // sequential probes of one waypoint search under a shared id would debounce
    // them against each other and collapse the search. `null` (no path) — and,
    // defensively, the debounced sentinel — mean "not reachable".
    const result = await navigation.findPath({
      startPos: start.toVector(),
      endPos: end.toVector(),
      nearestIsOk,
      max: lengthBound,
    });
    return Array.isArray(result) && result.length > 0;
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
    isCandidateValid?: (candPos: Vec2) => boolean,
  ): Promise<Waypoint | null> {
    for (let i = 0; i < tryToFindValid; i++) {
      const rndPos = inCircle(maxDistance);
      const candPos = curPos.added(rndPos);
      if (isCandidateValid && !isCandidateValid(candPos)) {
        continue;
      }
      if (await this._checkValid(curPos, candPos, true, maxDistance)) {
        const wp = new Waypoint({ pos: candPos.toVector() });
        wp.nearestIsOk = true;
        return wp;
      }
    }
    return null;
  }
}
