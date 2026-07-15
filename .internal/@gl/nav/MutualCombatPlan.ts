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
  private _onEngage: ((args: { partner: Character }) => void) | undefined;
  private _onDisengage: ((args: { partner: Character }) => void) | undefined;

  private _combatant: Character | null = null;
  private _scanCooldown: Delay = new Delay({ timeMs: 500 });

  constructor({
    self,
    getCombatants,
    defaultPlan,
    meetRadius,
    pause = 250,
    attackDistance,
    isValidPosition,
    onEngage,
    onDisengage,
  }: {
    self: Character;
    /** Returns the current pool of characters eligible for pairing. Called
     * fresh each scan, so the level can filter it dynamically (e.g. only
     * living, only nearby). */
    getCombatants: () => Character[];
    defaultPlan: NavPlan;
    meetRadius: number;
    pause?: number;
    attackDistance?: number;
    /** Returns false to reject a candidate meeting waypoint position. */
    isValidPosition?: (candPos: Vec2) => boolean;
    /** Fires when this combatant locks onto a new `partner`. */
    onEngage?: (args: { partner: Character }) => void;
    /** Fires when an existing pairing is dropped, reporting the `partner` that
     * was cleared. Does not fire when there was no partner. */
    onDisengage?: (args: { partner: Character }) => void;
  }) {
    super();
    this._self = self;
    this._getCombatants = getCombatants;
    this._defaultPlan = defaultPlan;
    this._meetRadius = meetRadius;
    this._pause = pause;
    this._attackDistance = attackDistance;
    this._isValidPosition = isValidPosition;
    this._onEngage = onEngage;
    this._onDisengage = onDisengage;
  }

  // --- MutualCombatant capability ---

  public isAvailableForCombat(): boolean {
    return this._combatant === null;
  }

  public acceptCombat(partner: Character): void {
    this._combatant = partner;
    this._onEngage?.({ partner });
  }

  /** Break the current pairing, making this combatant available again. */
  public clearCombat(): void {
    const partner = this._combatant;
    this._combatant = null;
    if (partner !== null) {
      this._onDisengage?.({ partner });
    }
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
    this.clearCombat();
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
