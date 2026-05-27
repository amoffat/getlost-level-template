/**
 * Manages a periodic timer. `tick` should be called every frame with the delta
 * time since the last frame. When the timer reaches the specified frequency,
 * `tick` will return true.
 */
export class Delay {
  public _timeMs: number;
  public _accumulatedMs: number = 0;
  private _done: boolean = false;
  private _repeat: boolean = false;

  constructor(
    timeMs: number,
    initialDelay: number = 0,
    repeat: boolean = false,
  ) {
    this._done = timeMs <= 0 && !repeat;
    this._timeMs = timeMs;
    this._repeat = repeat;

    if (repeat) {
      // Start with a negative delay so that the first tick is immediate
      this._accumulatedMs = -initialDelay + timeMs;
    }
  }

  public reset(): void {
    this._accumulatedMs = 0;
    this._done = this._timeMs <= 0;
  }

  public get done(): boolean {
    return this._done;
  }

  public set timeMs(value: number) {
    this._timeMs = value;
    this.reset();
  }

  public get timeMs(): number {
    return this._timeMs;
  }

  public tick(deltaMs: number): boolean {
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

  public toString(): string {
    return `Delay(${this._timeMs}ms, accumulated: ${this._accumulatedMs}ms, done: ${this._done}, repeat: ${this._repeat})`;
  }
}
