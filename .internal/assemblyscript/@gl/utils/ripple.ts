import type { RippleFilterOpts } from "../api/types/filter";
import * as filters from "../api/w2h/filters";

export class RippleFilter {
  private _size: number;
  private _speed: number;
  private _strength: number;

  private _id: number;

  constructor(opts: RippleFilterOpts) {
    this._size = opts.size;
    this._speed = opts.speed;
    this._strength = opts.strength;

    this._id = filters.addRippleFilter(opts);
  }

  set influence(amt: number) {
    filters.setFilterInfluence(this._id, amt);
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
}

export function createUnderwaterFilter(
  size: number = 0.9,
  speed: number = 0.2,
  strength: number = 0.7
): RippleFilter {
  return new RippleFilter({ size, speed, strength });
}

export function createHeatFilter(
  size: number = 0.18,
  speed: number = 1.7,
  strength: number = 0.14
): RippleFilter {
  return new RippleFilter({ size, speed, strength });
}
