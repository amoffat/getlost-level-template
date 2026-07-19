import type { Character } from "@gl/utils/character";
import { inCircle } from "@gl/utils/rand";
import { Vec2 } from "@gl/utils/vec2";
import { Waypoint } from "@gl/utils/waypoint";
import type { CombatEngagement } from "./CombatEngagement";
import { NavPlan, tryToFindValid } from "./NavPlan";

/**
 * The *movement* half of mutual combat. All pairing state — who this character
 * is fighting and where the pair should meet — lives in a {@link CombatEngagement};
 * this plan only asks the engagement where to stand and navigates there.
 *
 * Each waypoint the engagement is consulted for a meet position: when engaged,
 * the character jitters within `meetRadius` of it (so a pair converges on a
 * common point rather than chasing each other's exact positions); when unengaged
 * (`getMeetPosition` returns null), it falls back to `defaultPlan`.
 *
 * `isValidPosition` filters candidate meeting waypoints (e.g. keep clear of a
 * hazard), and `attackDistance` bounds how far a meeting waypoint may be pathed.
 */
export class MutualCombatPlan extends NavPlan {
  private _self: Character;
  private _engagement: CombatEngagement;
  private _defaultPlan: NavPlan;
  private _meetRadius: number;
  private _pause: number;
  private _attackDistance: number | undefined;
  private _isValidPosition: ((candPos: Vec2) => boolean) | undefined;

  /** The focus we last committed a waypoint for. Used purely to detect a focus
   * change and force a re-nav — see {@link tick}. */
  private _committedFocus: Character | null = null;

  constructor({
    self,
    engagement,
    defaultPlan,
    meetRadius,
    pause = 250,
    attackDistance,
    isValidPosition,
  }: {
    self: Character;
    /** Owns this character's pairing state; the source of truth for its focus
     * and meeting position. */
    engagement: CombatEngagement;
    defaultPlan: NavPlan;
    meetRadius: number;
    pause?: number;
    attackDistance?: number;
    /** Returns false to reject a candidate meeting waypoint position. */
    isValidPosition?: (candPos: Vec2) => boolean;
  }) {
    super();
    this._self = self;
    this._engagement = engagement;
    this._defaultPlan = defaultPlan;
    this._meetRadius = meetRadius;
    this._pause = pause;
    this._attackDistance = attackDistance;
    this._isValidPosition = isValidPosition;
  }

  public override async getNextWaypoint(
    curPos: Vec2,
  ): Promise<Waypoint | null> {
    const meetPos = this._engagement.getMeetPosition(this._self);
    this._committedFocus = this._engagement.getFocus(this._self);

    if (meetPos === null) {
      // Unpaired fallback.
      const wp = await this._defaultPlan.getNextWaypoint(curPos);
      if (wp) {
        wp.nearestIsOk = true;
      }
      return wp;
    }

    return this._meetWaypoint(curPos, meetPos);
  }

  public override async tick(_deltaMS: number, _curPos: Vec2): Promise<boolean> {
    // NavManager only re-consults the plan on arrival/pause or when tick returns
    // true. Force a re-nav the instant our focus changes (engaged, dropped, or
    // switched targets); plain positional drift of a live meeting point is picked
    // up naturally at the next pause, so we don't churn every frame.
    return this._engagement.getFocus(this._self) !== this._committedFocus;
  }

  /**
   * Picks a waypoint within `meetRadius` of the engagement-resolved meeting
   * point. The jitter keeps a converging pair's chosen waypoints close together
   * so they meet at a common point instead of chasing each other exactly.
   */
  private async _meetWaypoint(
    curPos: Vec2,
    meetPos: Vec2,
  ): Promise<Waypoint | null> {
    for (let i = 0; i < tryToFindValid; i++) {
      const candPos = meetPos.added(inCircle(this._meetRadius));
      if (this._isValidPosition && !this._isValidPosition(candPos)) continue;
      if (await this._checkValid(curPos, candPos, true, this._attackDistance)) {
        const wp = new Waypoint({ pos: candPos.toVector() });
        wp.pause = this._pause;
        wp.nearestIsOk = true;
        return wp;
      }
    }
    return null;
  }
}
