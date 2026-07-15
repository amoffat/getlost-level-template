import type { Character } from "@gl/utils/character";
import { Delay } from "@gl/utils/delay";
import { inCircle } from "@gl/utils/rand";
import { Vec2 } from "@gl/utils/vec2";
import { Waypoint } from "@gl/utils/waypoint";
import { NavPlan, tryToFindValid } from "./NavPlan";

/**
 * Capability implemented by any nav plan that can be paired off into mutual
 * combat. Probed via duck-typing (see {@link isMutualCombatant}) so the
 * combatant list isn't restricted to a single plan type.
 */
export interface MutualCombatant {
  /** True when this plan is free to be paired with a new partner. */
  isAvailableForCombat(): boolean;
  /** Lock this plan onto `partner`, making it unavailable for new pairings. */
  acceptCombat(partner: Character): void;
  clearCombat(): void;
}

/**
 * Duck-typed type guard: narrows a plan to {@link MutualCombatant} when it
 * exposes the capability. Deliberately avoids `instanceof` so plans other than
 * {@link MutualAttackPlan} can opt in.
 */
export function isMutualCombatant(
  plan: NavPlan,
): plan is NavPlan & MutualCombatant {
  const p = plan as Partial<MutualCombatant>;
  return (
    typeof p.isAvailableForCombat === "function" &&
    typeof p.acceptCombat === "function" &&
    typeof p.clearCombat === "function"
  );
}

/**
 * A plan where a set of characters seek out and fight *each other*. Each
 * combatant picks the nearest available peer, performs a mutual "are you
 * available for combat?" handshake, and once two agree they lock onto each
 * other and converge on a shared point — the midpoint between the pair —
 * jittering within `meetRadius` of it so they meet in the middle instead of
 * chasing each other's separate positions.
 *
 * Pairings can dissolve: mutuality is re-validated each waypoint, and
 * {@link clearCombat} lets external code (e.g. a death handler) free a combatant
 * to re-pair. While unpaired, the character falls back to `defaultPlan`.
 *
 * Two optional callbacks let the level customize behavior: `isValidPosition`
 * filters candidate meeting waypoints, and `onMeet` fires once each time a
 * pair closes to within `meetRadius` — a hook for attack sounds or randomized
 * "hurt" events.
 */
export class MutualAttackPlan extends NavPlan implements MutualCombatant {
  private _self: Character;
  private _getCombatants: () => Character[];
  private _defaultPlan: NavPlan;
  private _meetRadius: number;
  private _pause: number;
  private _attackDistance: number | undefined;
  private _isValidPosition: ((candPos: Vec2) => boolean) | undefined;
  private _onMeet: ((partner: Character) => void) | undefined;

  private _combatant: Character | null = null;
  private _scanCooldown: Delay = new Delay(500);
  /** True while the current pair is within `meetRadius`; gates `onMeet` so it
   * fires once per approach rather than every frame. */
  private _isMeeting: boolean = false;
  private _meetResetMultiplier: number;

  constructor({
    self,
    getCombatants,
    defaultPlan,
    meetRadius,
    meetResetMultiplier = 2,
    pause = 250,
    attackDistance,
    isValidPosition,
    onMeet,
  }: {
    self: Character;
    /** Returns the current pool of characters eligible for pairing. Called
     * fresh each scan, so the level can filter it dynamically (e.g. only
     * living, only nearby). */
    getCombatants: () => Character[];
    defaultPlan: NavPlan;
    meetRadius: number;
    meetResetMultiplier?: number;
    pause?: number;
    attackDistance?: number;
    /** Returns false to reject a candidate meeting waypoint position. */
    isValidPosition?: (candPos: Vec2) => boolean;
    /** Fired once per meeting when the pair first closes to within
     * `meetRadius`. Fires on exactly one of the two combatants. */
    onMeet?: (partner: Character) => void;
  }) {
    super();
    this._self = self;
    this._getCombatants = getCombatants;
    this._defaultPlan = defaultPlan;
    this._meetRadius = meetRadius;
    this._meetResetMultiplier = meetResetMultiplier;
    this._pause = pause;
    this._attackDistance = attackDistance;
    this._isValidPosition = isValidPosition;
    this._onMeet = onMeet;
  }

  // --- MutualCombatant capability ---

  public isAvailableForCombat(): boolean {
    return this._combatant === null;
  }

  public acceptCombat(partner: Character): void {
    this._combatant = partner;
    this._isMeeting = false;
  }

  /** Break the current pairing, making this combatant available again. */
  public clearCombat(): void {
    this._combatant = null;
    this._isMeeting = false;
  }

  /** The character we're currently locked onto, if any. */
  public getCombatant(): Character | null {
    return this._combatant;
  }

  // --- NavPlan ---

  public override async getNextWaypoint(
    curPos: Vec2,
  ): Promise<Waypoint | null> {
    this._revalidatePairing();

    if (this._combatant === null) {
      this._tryToPair(curPos);
    }

    if (this._combatant !== null) {
      return this._meetWaypoint(curPos, this._combatant);
    }

    // Unpaired fallback.
    const wp = await this._defaultPlan.getNextWaypoint(curPos);
    if (wp) {
      wp.nearestIsOk = true;
    }
    return wp;
  }

  public override async tick(deltaMS: number, curPos: Vec2): Promise<boolean> {
    // While unpaired, interrupt a long default waypoint as soon as an available
    // peer exists so we pair off promptly instead of finishing the wander.
    this._revalidatePairing();
    if (this._combatant === null) {
      if (this._scanCooldown.tick(deltaMS)) {
        return this._findNearestAvailable(curPos) !== null;
      }
      return false;
    }
    // Paired: watch for the pair closing in so we can fire `onMeet`.
    this._detectMeeting(curPos);
    return false;
  }

  // --- internals ---

  /**
   * If our partner no longer points back at us (reassigned, freed, or given a
   * plan without the capability), drop the pairing so we can re-pair.
   */
  private _revalidatePairing(): void {
    if (this._combatant === null) return;
    const partnerPlan = this._combatant.nav.getNavPlan();
    if (partnerPlan instanceof MutualAttackPlan) {
      // Same implementation: verify the back-reference points at us.
      if (partnerPlan.getCombatant() === this._self) return;
    } else if (isMutualCombatant(partnerPlan)) {
      // A different MutualCombatant implementation exposes no back-reference, so
      // we can't confirm it's still *us*. Keep the pairing while it stays locked
      // (unavailable); if it frees up, it has dropped us, so we drop it too.
      if (!partnerPlan.isAvailableForCombat()) return;
    }
    this._combatant = null;
    this._isMeeting = false;
  }

  /**
   * Fire `onMeet` once each time the pair closes to within `meetRadius`. A
   * hysteresis band (must separate past `2 * meetRadius` before re-arming)
   * prevents repeat fires while they hover near each other. Both combatants
   * detect the meeting independently, so a stable id tiebreak ensures exactly
   * one of the pair announces it.
   */
  private _detectMeeting(curPos: Vec2): void {
    if (this._combatant === null || this._onMeet === undefined) return;
    const dist = curPos.distanceTo(this._combatant.getPos());
    if (!this._isMeeting) {
      if (dist <= this._meetRadius) {
        this._isMeeting = true;
        if (this._self.id < this._combatant.id) {
          this._onMeet(this._combatant);
        }
      }
    } else if (dist > this._meetRadius * this._meetResetMultiplier) {
      this._isMeeting = false;
    }
  }

  private _tryToPair(curPos: Vec2): void {
    const peer = this._findNearestAvailable(curPos);
    if (peer === null) return;
    const peerPlan = peer.nav.getNavPlan();
    if (!isMutualCombatant(peerPlan) || !peerPlan.isAvailableForCombat())
      return;
    if (!this.isAvailableForCombat()) return;

    // Symmetric lock.
    this.acceptCombat(peer);
    peerPlan.acceptCombat(this._self);
  }

  private _findNearestAvailable(curPos: Vec2): Character | null {
    let nearest: Character | null = null;
    let nearestDist = Number.POSITIVE_INFINITY;

    for (const peer of this._getCombatants()) {
      if (peer === this._self) continue;
      const peerPlan = peer.nav.getNavPlan();
      if (!isMutualCombatant(peerPlan) || !peerPlan.isAvailableForCombat()) {
        continue;
      }
      const dist = curPos.distanceTo(peer.getPos());
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = peer;
      }
    }
    return nearest;
  }

  /**
   * Both combatants converge on the midpoint between them. The midpoint is
   * symmetric, so each computes the same base point; the `meetRadius` jitter
   * keeps their chosen waypoints within ~`meetRadius` of one another so they
   * meet at a common point instead of chasing each other's positions.
   */
  private async _meetWaypoint(
    curPos: Vec2,
    partner: Character,
  ): Promise<Waypoint | null> {
    const midpoint = curPos.lerped(partner.getPos(), 0.5);
    for (let i = 0; i < tryToFindValid; i++) {
      const candPos = midpoint.added(inCircle(this._meetRadius));
      if (this._isValidPosition && !this._isValidPosition(candPos)) continue;
      if (await this._checkValid(curPos, candPos, true, this._attackDistance)) {
        const wp = new Waypoint(candPos.toVector());
        wp.pause = this._pause;
        wp.nearestIsOk = true;
        return wp;
      }
    }
    return null;
  }
}
