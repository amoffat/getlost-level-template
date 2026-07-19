import type { Character } from "@gl/utils/character";
import { Vec2 } from "@gl/utils/vec2";

/**
 * Per-character bookkeeping the engagement keeps for every registered combatant.
 */
interface CombatEntry {
  char: Character;
  /** Returns the pool of characters this combatant is *willing* to seek. Called
   * fresh each scan so the level can vary it dynamically. Purely directional —
   * it says nothing about who may seek *this* character. */
  getCandidates: () => Character[];
  /** The single opponent this character is currently moving to fight — the
   * nearest of its engaged opponents — or null while it has none. Recomputed
   * each {@link CombatEngagement.tick}. */
  target: Character | null;
  onEngage: ((target: Character) => void) | undefined;
  onDisengage: ((target: Character) => void) | undefined;
}

/**
 * Central coordinator for "characters seeking and fighting each other." It owns
 * *all* engagement state — who each combatant is fighting and where it should
 * stand — so nav plans stay purely about movement.
 *
 * The model is **directional and many-to-many**:
 *
 * - Each combatant is registered with a `getCandidates` function describing who
 *   *it* is willing to attack. That is the only thing a character needs to know;
 *   it never has to enumerate who might attack *it*. So A can be engaged by B
 *   (and simultaneously by C) without A knowing anything about B or C.
 * - A combatant is simultaneously *engaged* with **every** valid candidate at
 *   once (see {@link getEngaged}) — a character in a crowd is fighting the whole
 *   crowd. Whether a given pairing is allowed is gated by {@link isPairingValid},
 *   which subclasses may override.
 *
 * A body can only be in one place, so for *movement* each combatant converges on
 * the midpoint between itself and its **nearest** engaged opponent (its
 * {@link getFocus target}). Two combatants that are each other's nearest meet
 * cleanly in the middle (a duel); when several attackers share a nearest target
 * they all close on it, ganging up. A pure target that seeks no one (e.g. the
 * player) engages nobody, so it holds still while its attackers converge on it.
 *
 * A combatant removed via {@link remove} (e.g. on death) instantly stops being a
 * valid opponent for anyone, and any attacker targeting it re-targets a live
 * opponent on the next {@link tick}.
 */
export class CombatEngagement {
  private _entries = new Map<string, CombatEntry>();
  private _targetHysteresis: number;

  /**
   * @param targetHysteresis A rival opponent must be at least this many world
   * units closer than the current target before a character switches to it.
   * Damps movement-target flip-flop between two near-equidistant opponents (each
   * switch forces a re-nav). 0 disables it — always chase the strict nearest.
   */
  constructor({ targetHysteresis = 6 }: { targetHysteresis?: number } = {}) {
    this._targetHysteresis = targetHysteresis;
  }

  // --- registration ---

  public add(opts: {
    char: Character;
    getCandidates: () => Character[];
    /** Fires when this character's movement target (nearest engaged opponent)
     * is (re)assigned, including a switch to a new nearest. */
    onEngage?: (target: Character) => void;
    /** Fires when this character's movement target is dropped, reporting the old
     * target. */
    onDisengage?: (target: Character) => void;
  }): void {
    this._entries.set(opts.char.id, {
      char: opts.char,
      getCandidates: opts.getCandidates,
      target: null,
      onEngage: opts.onEngage,
      onDisengage: opts.onDisengage,
    });
  }

  /**
   * Drop a combatant from the fight entirely: clears its own target and any other
   * combatant that was targeting it, so a corpse can never be sought again.
   */
  public remove(char: Character): void {
    const entry = this._entries.get(char.id);
    if (entry) {
      this._setTarget(entry, null);
      this._entries.delete(char.id);
    }
    for (const other of this._entries.values()) {
      if (other.target === char) {
        this._setTarget(other, null);
      }
    }
  }

  // --- queries ---

  /** The nearest engaged opponent this character is moving to fight, or null. */
  public getFocus(char: Character): Character | null {
    return this._entries.get(char.id)?.target ?? null;
  }

  /**
   * Everyone this character is currently engaged with (the full many-to-many
   * set): registered opponents it is willing and allowed to fight. Useful for
   * multi-target effects (attacks, look-at); movement only uses the nearest.
   */
  public getEngaged(char: Character): Character[] {
    return this._opponents(char);
  }

  /**
   * Where `char` should stand this instant: the midpoint between it and its
   * nearest engaged opponent, or null if it has none (its plan should fall back
   * to wandering).
   */
  public getMeetPosition(char: Character): Vec2 | null {
    const entry = this._entries.get(char.id);
    if (!entry || entry.target === null) return null;
    return entry.char.getPos().lerped(entry.target.getPos(), 0.5);
  }

  // --- per-frame coordination ---

  /**
   * Re-evaluates every combatant's movement target: the nearest of its currently
   * valid opponents (or null when it has none), with a hysteresis band so a
   * still-valid current target isn't abandoned for a marginally-closer rival.
   * Fires engage/disengage on any change.
   */
  public tick(_deltaMs: number): void {
    for (const entry of this._entries.values()) {
      const opponents = this._opponents(entry.char);
      this._setTarget(entry, this._pickTarget(entry, opponents));
    }
  }

  // --- overridable policy ---

  /**
   * Returns whether `a` is allowed to engage `b`. The default permits any
   * candidate; subclasses can override to encode richer rules (range caps,
   * line-of-sight, faction exceptions, …). Called for the seeker→candidate
   * direction only.
   */
  protected isPairingValid(_a: Character, _b: Character): boolean {
    return true;
  }

  // --- internals ---

  private _setTarget(entry: CombatEntry, next: Character | null): void {
    const prev = entry.target;
    if (prev === next) return;
    entry.target = next;
    if (prev !== null) entry.onDisengage?.(prev);
    if (next !== null) entry.onEngage?.(next);
  }

  /**
   * The candidates `char` may currently engage: registered (so a removed corpse
   * is excluded), not itself, and passing {@link isPairingValid}.
   */
  private _opponents(char: Character): Character[] {
    const entry = this._entries.get(char.id);
    if (!entry) return [];
    return entry
      .getCandidates()
      .filter(
        (c) =>
          c !== char && this._entries.has(c.id) && this.isPairingValid(char, c),
      );
  }

  /**
   * The opponent `entry` should move to fight: the strict nearest, except that a
   * still-engaged current target is kept unless a rival is closer by more than
   * {@link _targetHysteresis} (avoids re-nav thrash between near-equidistant
   * opponents).
   */
  private _pickTarget(
    entry: CombatEntry,
    opponents: Character[],
  ): Character | null {
    const from = entry.char.getPos();
    const nearest = this._nearest(from, opponents);
    if (nearest === null) return null;

    const current = entry.target;
    if (current !== null && opponents.includes(current)) {
      const currentDist = from.distanceTo(current.getPos());
      const nearestDist = from.distanceTo(nearest.getPos());
      if (currentDist - nearestDist <= this._targetHysteresis) {
        return current;
      }
    }
    return nearest;
  }

  /** The closest of `opponents` to `from`, or null if there are none. */
  private _nearest(from: Vec2, opponents: Character[]): Character | null {
    let nearest: Character | null = null;
    let nearestDist = Number.POSITIVE_INFINITY;
    for (const opp of opponents) {
      const dist = from.distanceTo(opp.getPos());
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = opp;
      }
    }
    return nearest;
  }
}
