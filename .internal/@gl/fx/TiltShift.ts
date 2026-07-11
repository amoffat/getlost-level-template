import * as filters from "@gl/api/filter";
import { Filter } from "./Filter";

export interface TiltShiftOpts {
  /** Amount of blur applied above and below the focus band. Defaults to 0. */
  blur?: number;
}

/**
 * A tilt-shift effect: the scene stays sharp along a horizontal focus band and
 * blurs away from it. Typically {@link y} is updated every tick to follow the
 * camera/player so the focus band tracks them.
 *
 * The two host controls (`setTiltShiftBlur`, `setTiltShiftY`) are independent,
 * so each setter pushes directly rather than through a shared `_sync()`.
 */
export class TiltShift extends Filter {
  private _blur: number;
  private _y = 0;

  constructor(opts: TiltShiftOpts = {}) {
    super(filters.addTiltShift(opts.blur ?? 0));
    this._blur = opts.blur ?? 0;
  }

  get blur(): number {
    return this._blur;
  }
  set blur(blur: number) {
    this._blur = blur;
    filters.setTiltShiftBlur(this._id, blur);
  }

  /** The focus band's vertical position, in screen-space pixels. */
  get y(): number {
    return this._y;
  }
  set y(y: number) {
    this._y = y;
    filters.setTiltShiftY(this._id, y);
  }
}
