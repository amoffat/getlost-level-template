import * as filters from "@gl/api/filter";
import type { BloomFilterOpts } from "@gl/types/filters/bloom";
import { Filter } from "./Filter";

/**
 * Wrapper-owned defaults so the class always holds a full {@link BloomFilterOpts}
 * (the host accepts a partial). Adjust these if they drift from the host's own
 * defaults.
 */
const DEFAULTS: BloomFilterOpts = {
  threshold: 0.5,
  blur: 8,
  brightness: 1,
  bloomScale: 1,
};

/**
 * A bloom effect: bright regions above {@link threshold} bleed a soft glow.
 *
 * Owns the full effect state (unlike the host, which takes a partial), so any
 * field can be read back and every setter re-pushes the whole state via
 * {@link setBloomOpts}.
 */
export class Bloom extends Filter {
  private _opts: BloomFilterOpts;

  constructor(opts: Partial<BloomFilterOpts> = {}) {
    const merged: BloomFilterOpts = { ...DEFAULTS, ...opts };
    super(filters.addBloom(merged));
    this._opts = merged;
  }

  private _sync(): void {
    filters.setBloomOpts(this._id, this._opts);
  }

  /** Luminance above which pixels start to glow. */
  get threshold(): number {
    return this._opts.threshold;
  }
  set threshold(v: number) {
    this._opts.threshold = v;
    this._sync();
  }

  /** Radius of the glow. */
  get blur(): number {
    return this._opts.blur;
  }
  set blur(v: number) {
    this._opts.blur = v;
    this._sync();
  }

  /** Overall brightness of the result. */
  get brightness(): number {
    return this._opts.brightness;
  }
  set brightness(v: number) {
    this._opts.brightness = v;
    this._sync();
  }

  /** Intensity of the glow that is added back over the scene. */
  get bloomScale(): number {
    return this._opts.bloomScale;
  }
  set bloomScale(v: number) {
    this._opts.bloomScale = v;
    this._sync();
  }
}
