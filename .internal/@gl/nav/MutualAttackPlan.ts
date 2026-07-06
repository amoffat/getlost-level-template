import type { Character } from "@gl/utils/character";
import { Delay } from "@gl/utils/delay";
import { inRing } from "@gl/utils/rand";
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
    typeof p.acceptCombat === "function"
  );
}

/**
 * A plan where a set of characters seek out and fight *each other*. Each
 * combatant picks the nearest available peer, performs a mutual "are you
 * available for combat?" handshake, and once two agree they lock onto each
 * other and continually flank — circling within `flankRadius` of their partner
 * while staying outside `minDistance`.
 *
 * Pairings can dissolve: mutuality is re-validated each waypoint, and
 * {@link clearCombat} lets external code (e.g. a death handler) free a combatant
 * to re-pair. While unpaired, the character falls back to `defaultPlan`.
 */
export class MutualAttackPlan extends NavPlan implements MutualCombatant {
  private _self: Character;
  private _combatants: Character[];
  private _defaultPlan: NavPlan;
  private _flankRadius: number;
  private _minDistance: number;
  private _pause: number;
  private _attackDistance: number | undefined;

  private _combatant: Character | null = null;
  private _scanCooldown: Delay = new Delay(500);

  constructor({
    self,
    combatants,
    defaultPlan,
    flankRadius,
    minDistance = 0,
    pause = 250,
    attackDistance,
  }: {
    self: Character;
    combatants: Character[];
    defaultPlan: NavPlan;
    flankRadius: number;
    minDistance?: number;
    pause?: number;
    attackDistance?: number;
  }) {
    super();
    this._self = self;
    this._combatants = combatants;
    this._defaultPlan = defaultPlan;
    this._flankRadius = flankRadius;
    this._minDistance = minDistance;
    this._pause = pause;
    this._attackDistance = attackDistance;
  }

  // --- MutualCombatant capability ---

  public isAvailableForCombat(): boolean {
    return this._combatant === null;
  }

  public acceptCombat(partner: Character): void {
    this._combatant = partner;
  }

  /** Break the current pairing, making this combatant available again. */
  public clearCombat(): void {
    this._combatant = null;
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
      return this._flankWaypoint(curPos, this._combatant);
    }

    // Unpaired fallback.
    const wp = await this._defaultPlan.getNextWaypoint(curPos);
    if (wp) {
      wp.nearestIsOk = true;
    }
    return wp;
  }

  public override async tick(
    deltaMS: number,
    curPos: Vec2,
  ): Promise<boolean> {
    // While unpaired, interrupt a long default waypoint as soon as an available
    // peer exists so we pair off promptly instead of finishing the wander.
    this._revalidatePairing();
    if (this._combatant === null && this._scanCooldown.tick(deltaMS)) {
      return this._findNearestAvailable(curPos) !== null;
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
    this._combatant = null;
  }

  private _tryToPair(curPos: Vec2): void {
    const peer = this._findNearestAvailable(curPos);
    if (peer === null) return;
    const peerPlan = peer.nav.getNavPlan();
    if (!isMutualCombatant(peerPlan) || !peerPlan.isAvailableForCombat()) return;
    if (!this.isAvailableForCombat()) return;

    // Symmetric lock.
    this._combatant = peer;
    peerPlan.acceptCombat(this._self);
  }

  private _findNearestAvailable(curPos: Vec2): Character | null {
    let nearest: Character | null = null;
    let nearestDist = Number.POSITIVE_INFINITY;

    for (const peer of this._combatants) {
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

  private async _flankWaypoint(
    curPos: Vec2,
    partner: Character,
  ): Promise<Waypoint | null> {
    const partnerPos = partner.getPos();
    for (let i = 0; i < tryToFindValid; i++) {
      const candPos = partnerPos.added(
        inRing(this._minDistance, this._flankRadius),
      );
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
