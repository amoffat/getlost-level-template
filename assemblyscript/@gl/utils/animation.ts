import { ProgressCallback } from "../types/animation";
import { VoidFunction } from "../types/void";
import { addListener } from "./callbacks";
import { EasingFunction, linear } from "./easing";

export function lerp(a: f32, b: f32, t: f32): f32 {
  return a + (b - a) * t;
}

export class AnimatorOpts {
  duration: f32 = 1000;
  forwardCurve: EasingFunction = linear;
  reverseCurve: EasingFunction = linear;
  repeat: bool = false;
  pingPong: bool = false;
}

export class Animator {
  private _elapsedTime: f32 = 0;
  private _duration: f32;
  private _speed: f32 = 1;
  private _forwardCurve: EasingFunction;
  private _reverseCurve: EasingFunction;
  private _direction: i8 = 1; // 1 for forward, -1 for backward
  private _isPlaying: bool = false;

  private _repeat: bool = false;
  private _pingPong: bool = false;

  // These can't be used yet because AS doesn't support closures.
  private _progressCallbacks: ProgressCallback[] = [];
  private _completeCallbacks: VoidFunction[] = [];
  // We use this to store the current progress of the animation, instead of
  // unsupported closure callbacks.
  progress: f32 = 0;

  constructor(opts: AnimatorOpts) {
    this._duration = opts.duration;
    this._forwardCurve = opts.forwardCurve;
    this._reverseCurve = opts.reverseCurve;
    this._repeat = opts.repeat;
    this._pingPong = opts.pingPong;

    // If we're ping-ponging, we need to set the speed to 0.5 so that the
    // animation takes the same amount of time to go forward and backward.
    if (this._pingPong) {
      this.speed = 2;
    }
  }

  clearProgressCallbacks(): void {
    this._progressCallbacks = [];
  }

  addProgressCallback(callback: ProgressCallback): VoidFunction {
    return addListener(this._progressCallbacks, callback);
  }

  addCompleteCallback(callback: VoidFunction): VoidFunction {
    return addListener(this._completeCallbacks, callback);
  }

  // Sets the duration of the animation in milliseconds, while taking into
  // account that the animation may be in progress, and we should preserve the
  // progress.
  set duration(duration: f32) {
    const progress = this._elapsedTime / this._duration;
    this._duration = duration;
    this._elapsedTime = progress * this._duration;
  }

  get duration(): f32 {
    return this._duration;
  }

  /** A time duration othat accounts for our speed */
  get adjustedDuration(): f32 {
    return this._duration / this._speed;
  }

  set speed(speed: f32) {
    this._speed = speed;
  }

  tick(deltaMS: f32): void {
    if (!this._isPlaying) return;

    this._elapsedTime += deltaMS * this._direction;
    const timeProgress = Math.max(
      0,
      Math.min(this._elapsedTime / this.adjustedDuration, 1)
    ) as f32;

    const valueFn =
      this._direction == 1 ? this._forwardCurve : this._reverseCurve;
    const valueProgress = valueFn(timeProgress);

    for (let i = 0; i < this._progressCallbacks.length; i++) {
      const callback = this._progressCallbacks[i];
      callback(valueProgress);
    }

    let isComplete = false;

    if (
      this._isPlaying &&
      !this._repeat &&
      !this._pingPong &&
      ((valueProgress === 1 && this._direction === 1) ||
        (valueProgress === 0 && this._direction === -1))
    ) {
      isComplete = true;
    }

    if (valueProgress === 0 || valueProgress === 1) {
      if (this._pingPong && !this._repeat) {
        if (this._direction === 1 && valueProgress === 1) {
          this._direction = -1;
          this._elapsedTime = this.adjustedDuration;
        } else if (this._direction === -1 && valueProgress === 0) {
          isComplete = true;
        }
      } else if (this._repeat) {
        if (this._pingPong) {
          this._direction *= -1;
          this._elapsedTime = valueProgress === 0 ? 0 : this.adjustedDuration;
        } else {
          this._elapsedTime = 0;
        }
      } else {
        isComplete = true;
      }
    }

    if (isComplete) {
      this._isPlaying = false;
      for (let i = 0; i < this._completeCallbacks.length; i++) {
        const callback = this._completeCallbacks[i];
        callback();
      }
    }

    this.progress = valueProgress;
  }

  play(): void {
    this._direction = 1;
    this._isPlaying = true;
    this._elapsedTime = 0;
  }

  reverse(): void {
    this._direction = -1;
    this._isPlaying = true;
    this._elapsedTime = this.adjustedDuration;
  }

  stop(): void {
    this._isPlaying = false;
  }

  get isAnimating(): bool {
    return this._isPlaying;
  }
}
