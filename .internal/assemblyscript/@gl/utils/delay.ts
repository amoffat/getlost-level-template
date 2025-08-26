/**
 * Manages a periodic timer. `tick` should be called every frame with the delta
 * time since the last frame. When the timer reaches the specified frequency,
 * `tick` will return true.
 */
export class Delay {
  public _timeMs: f32;
  public _accumulatedMs: f32 = 0;
  private _done: bool = false;
  private _repeat: bool = false;

  constructor(timeMs: f32, initialDelay: f32 = 0, repeat: bool = false) {
    this._done = timeMs <= 0;
    this._timeMs = timeMs;
    this._repeat = repeat;

    if (repeat) {
      // Start with a negative delay so that the first tick is immediate
      this._accumulatedMs = -initialDelay + timeMs;
    }
  }

  public get done(): bool {
    return this._done;
  }

  public set timeMs(value: f32) {
    this._timeMs = value;
    this._accumulatedMs = 0;
    this._done = value <= 0;
  }

  public get timeMs(): f32 {
    return this._timeMs;
  }

  public tick(deltaMs: f32): bool {
    if (this._done) return false;

    this._accumulatedMs += deltaMs;

    if (this._accumulatedMs >= this._timeMs) {
      // If a very large delta pushed accumulatedMs far past frequencyMs, reduce
      // it to the remainder after removing whole frequency periods. This keeps
      // a small residual instead of a large leftover.
      this._accumulatedMs = this._accumulatedMs % this._timeMs;
      if (!this._repeat) {
        this._done = true;
      }
      return true;
    }

    return false;
  }
}
