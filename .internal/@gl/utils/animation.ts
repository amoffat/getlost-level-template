import { globalTicker } from "@gl/ticker";
import { addListener } from "./callbacks";
import { type EasingFunction, Easings } from "./easing";

type ProgressCallback = (progress: number, direction: number) => void;
type BoundaryCallback = (forward: boolean) => void;

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export class Animator {
  private _elapsedTime: number = 0;
  private _durationMs: number;
  private _speed: number = 1;
  private _value: number = 0;
  private _progressCallbacks: ProgressCallback[] = [];
  private _startCallbacks: BoundaryCallback[] = [];
  private _completeCallbacks: BoundaryCallback[] = [];
  private _forwardCurve: EasingFunction;
  private _reverseCurve: EasingFunction;
  private _direction: 1 | -1 = 1; // 1 for forward, -1 for backward
  private _isPlaying: boolean = false;
  // Number of additional passes to run after the initial pass.
  // 0 => play once, Infinity => loop forever, N => play N additional passes.
  repeat: number;
  pingPong: boolean;
  private _repeatsLeft: number = 0;

  private _selfTick: boolean;
  private _tickCallback: ((deltaMs: number) => void) | null = null;

  constructor({
    durationMs,
    forwardCurve = Easings.linear,
    reverseCurve,
    repeat = 0,
    pingPong = false,
    selfTick = false,
  }: {
    durationMs: number;
    forwardCurve?: EasingFunction;
    reverseCurve?: EasingFunction;
    repeat?: number;
    pingPong?: boolean;
    selfTick?: boolean;
  }) {
    this._durationMs = durationMs;
    this._selfTick = selfTick;
    this._forwardCurve = forwardCurve;
    this._reverseCurve = reverseCurve ?? this._forwardCurve;
    this.repeat = repeat;
    this.pingPong = pingPong;
    this._repeatsLeft = this.repeat;

    if (selfTick) {
      this._tickCallback = (deltaMs) => this.tick(deltaMs);
      globalTicker.subscribe(this._tickCallback);
    }
  }

  clearProgressCallbacks() {
    this._progressCallbacks = [];
  }

  addProgressCallback(callback: ProgressCallback): VoidFunction {
    return addListener(this._progressCallbacks, callback);
  }

  addStartCallback(callback: BoundaryCallback): VoidFunction {
    return addListener(this._startCallbacks, callback);
  }

  addCompleteCallback(callback: BoundaryCallback): VoidFunction {
    return addListener(this._completeCallbacks, callback);
  }

  // Sets the duration of the animation in milliseconds, while taking into
  // account that the animation may be in progress, and we should preserve the
  // progress.
  set duration(duration: number) {
    const progress = this._elapsedTime / this._durationMs;
    this._durationMs = duration;
    this._elapsedTime = progress * duration;
  }

  private get _adjustedDuration(): number {
    return this._durationMs / this._speed;
  }

  set speed(speed: number) {
    this._speed = speed;
  }

  get value(): number {
    return this._value;
  }

  tick(deltaMS: number) {
    if (!this._isPlaying) return;

    this._elapsedTime += deltaMS * this._direction;
    const progress = Math.max(
      0,
      Math.min(this._elapsedTime / this._adjustedDuration, 1),
    );

    const valueFn =
      this._direction == 1 ? this._forwardCurve : this._reverseCurve;
    const value = valueFn(progress);
    this._value = value;

    for (const callback of this._progressCallbacks) {
      callback(value, this._direction);
    }

    if (value === 0 || value === 1) {
      const atForwardEnd = value === 1;
      const naturalEnd =
        (atForwardEnd && this._direction === 1) ||
        (!atForwardEnd && this._direction === -1);
      const canRepeat = this.repeat === Infinity || this._repeatsLeft > 0;

      if (!canRepeat) {
        this._isPlaying = false;
        if (this._tickCallback) {
          globalTicker.unsubscribe(this._tickCallback);
          this._tickCallback = null;
        }
        if (naturalEnd) {
          for (const callback of this._completeCallbacks) {
            callback(atForwardEnd);
          }
        }
        return;
      }

      // Decrement remaining repeats if finite.
      if (this._repeatsLeft !== Infinity) {
        this._repeatsLeft -= 1;
      }

      if (this.pingPong) {
        this._direction *= -1;
        this._elapsedTime = atForwardEnd ? this._adjustedDuration : 0;
      } else {
        // Restart from the beginning for forward direction.
        this._elapsedTime = 0;
      }
    }
  }

  public then(next: Animator) {
    this.addCompleteCallback(() => {
      next.play();
    });
  }

  // Processes the entire animation in one go, using the provided step value to
  // increment the progress. This is useful in the case of moving the camera to
  // a "safe" location, when the safety can only be determined by incremental
  // testing of the current position.
  playHeadless(step: number) {
    this.play();
    let counter = 0;
    while (this._isPlaying) {
      this.tick(step);
      counter++;
    }
  }

  play() {
    this._direction = 1;
    this._isPlaying = true;
    this._elapsedTime = 0;
    this._repeatsLeft = this.repeat;
    if (this._selfTick && !this._tickCallback) {
      this._tickCallback = (deltaMs) => this.tick(deltaMs);
      globalTicker.subscribe(this._tickCallback);
    }
    for (const callback of this._startCallbacks) {
      callback(true);
    }
  }

  reverse() {
    this._direction = -1;
    this._isPlaying = true;
    this._elapsedTime = this._adjustedDuration;
    this._repeatsLeft = this.repeat;
    if (this._selfTick && !this._tickCallback) {
      this._tickCallback = (deltaMs) => this.tick(deltaMs);
      globalTicker.subscribe(this._tickCallback);
    }
    for (const callback of this._startCallbacks) {
      callback(false);
    }
  }

  stop() {
    this._isPlaying = false;
    if (this._tickCallback) {
      globalTicker.unsubscribe(this._tickCallback);
      this._tickCallback = null;
    }
  }

  get isAnimating(): boolean {
    return this._isPlaying;
  }
}
