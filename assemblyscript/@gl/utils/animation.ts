import { ProgressCallback } from "../types/animation";
import { VoidFunction } from "../types/void";
import { addListener } from "./callbacks";
import { EasingFunction, linear } from "./easing";

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export class Animator {
  private _elapsedTime: number = 0;
  private _duration: number;
  private _speed: number = 1;
  private _progressCallbacks: ProgressCallback[] = [];
  private _completeCallbacks: VoidFunction[] = [];
  private _forwardCurve: EasingFunction;
  private _reverseCurve: EasingFunction;
  private _direction: i8 = 1; // 1 for forward, -1 for backward
  private _isPlaying: boolean = false;

  constructor(
    duration: number,
    forwardCurve: EasingFunction = linear,
    reverseCurve: EasingFunction = linear
  ) {
    this._duration = duration;
    this._forwardCurve = forwardCurve;
    this._reverseCurve = reverseCurve;
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
  set duration(duration: number) {
    const progress = this._elapsedTime / this._duration;
    this._duration = duration;
    this._elapsedTime = progress * duration;
  }

  private get _adjustedDuration(): number {
    return this._duration / this._speed;
  }

  set speed(speed: number) {
    this._speed = speed;
  }

  tick(deltaMS: number): void {
    if (!this._isPlaying) return;

    this._elapsedTime += deltaMS * this._direction;
    const progress = Math.max(
      0,
      Math.min(this._elapsedTime / this._adjustedDuration, 1)
    );

    const valueFn =
      this._direction == 1 ? this._forwardCurve : this._reverseCurve;
    const value = valueFn(progress);

    for (let i = 0; i < this._progressCallbacks.length; i++) {
      const callback = this._progressCallbacks[i];
      callback(value);
    }

    if (
      this._isPlaying &&
      ((value === 1 && this._direction === 1) ||
        (value === 0 && this._direction === -1))
    ) {
      for (let i = 0; i < this._completeCallbacks.length; i++) {
        const callback = this._completeCallbacks[i];
        callback();
      }
    }

    if (value === 0 || value === 1) {
      this._isPlaying = false;
    }
  }

  play(): void {
    this._direction = 1;
    this._isPlaying = true;
    this._elapsedTime = 0;
  }

  reverse(): void {
    this._direction = -1;
    this._isPlaying = true;
  }

  stop(): void {
    this._isPlaying = false;
  }

  isAnimating(): boolean {
    return this._isPlaying;
  }
}
