import { RippleFilterOpts } from "../api/types/filter";
import * as filters from "../api/w2h/filters";

export class RippleFilter {
  private _size: f32;
  private _speed: f32;
  private _strength: f32;

  private _id: i32;

  constructor(opts: RippleFilterOpts) {
    this._size = opts.size;
    this._speed = opts.speed;
    this._strength = opts.strength;

    this._id = filters.addRippleFilter(opts);
  }

  set influence(amt: f32) {
    filters.setFilterInfluence(this._id, amt);
  }

  set size(size: f32) {
    this._size = size;
    this._sync();
  }

  get size(): f32 {
    return this._size;
  }

  set speed(speed: f32) {
    this._speed = speed;
    this._sync();
  }
  get speed(): f32 {
    return this._speed;
  }

  set strength(strength: f32) {
    this._strength = strength;
    this._sync();
  }
  get strength(): f32 {
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
  size: f32 = 0.7,
  speed: f32 = 0.3,
  strength: f32 = 0.5
): RippleFilter {
  return new RippleFilter({ size, speed, strength });
}

export function createHeatFilter(
  size: f32 = 0.18,
  speed: f32 = 1.7,
  strength: f32 = 0.14
): RippleFilter {
  return new RippleFilter({ size, speed, strength });
}
