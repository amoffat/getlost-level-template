import * as filters from "@gl/api/filter";

/**
 * Base class for screen-space post-processing effects (a "filter"). Owns the
 * numeric handle returned by the host when the filter is created, and wraps the
 * one control every filter shares — {@link setFilterInfluence} — so callers work
 * with an object instead of threading a bare id through free functions.
 *
 * Mirrors the {@link SoundControls} and {@link Widget} base classes: the single
 * universal operation lives here once, and each subclass adds its own state and
 * setters (each pushing to the host via a private `_sync()`).
 *
 * Handles are acquired synchronously, so subclasses grab theirs in their own
 * constructor and pass it up via `super(filters.addX(...))`.
 */
export abstract class Filter {
  protected _id: number;

  constructor(id: number) {
    this._id = id;
  }

  /**
   * Enable or disable the filter. 0 = disabled, 1 = fully enabled; intermediate
   * values allow smooth transitions.
   */
  set influence(amt: number) {
    filters.setFilterInfluence(this._id, amt);
  }
}
