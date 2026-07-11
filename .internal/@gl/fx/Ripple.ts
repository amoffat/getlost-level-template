import * as filters from "@gl/api/filter";
import type { RippleFilterOpts } from "@gl/types/api/filter";
import { Filter } from "./Filter";

/**
 * A ripple/displacement effect that warps the scene, used for water, heat haze,
 * and similar distortions. See {@link underwater} and {@link heat} for presets.
 */
export class Ripple extends Filter {
  private _size: number;
  private _speed: number;
  private _strength: number;

  constructor(opts: RippleFilterOpts) {
    super(filters.addRippleFilter(opts));
    this._size = opts.size;
    this._speed = opts.speed;
    this._strength = opts.strength;
  }

  set size(size: number) {
    this._size = size;
    this._sync();
  }
  get size(): number {
    return this._size;
  }

  set speed(speed: number) {
    this._speed = speed;
    this._sync();
  }
  get speed(): number {
    return this._speed;
  }

  set strength(strength: number) {
    this._strength = strength;
    this._sync();
  }
  get strength(): number {
    return this._strength;
  }

  private _sync(): void {
    filters.updateRippleFilter(this._id, {
      size: this._size,
      speed: this._speed,
      strength: this._strength,
    });
  }

  /** A slow, large-scale ripple that reads as being underwater. */
  static underwater(
    size: number = 0.9,
    speed: number = 0.2,
    strength: number = 0.7,
  ): Ripple {
    return new Ripple({ size, speed, strength });
  }

  /** A fast, fine ripple that reads as heat haze. */
  static heat(
    size: number = 0.18,
    speed: number = 1.7,
    strength: number = 0.14,
  ): Ripple {
    return new Ripple({ size, speed, strength });
  }
}
