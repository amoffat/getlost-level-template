import * as camera from "@gl/api/camera";
import { TiltShift } from "@gl/fx";
import { globalTicker } from "@gl/ticker";
import type { Vector2 } from "@gl/types/api/vector";
import type { CameraTargetFn } from "@gl/types/camera";
import type { Matrix } from "@gl/utils/mat";

export interface ShakeOpts {
  magnitude?: number;
  durationMs?: number;
  easing?: string;
  speed?: number;
}

export interface CameraOpts {
  /**
   * Base tilt-shift blur at zoom 1.0. As you zoom in, blur falls off linearly to
   * 0 over {@link CameraOpts.blurFalloffRange}. Defaults to 0.06.
   */
  blur?: number;
  /**
   * The zoom-in amount (past 1.0) over which the blur falls from its base to 0.
   * e.g. with the default 0.3, blur reaches 0 at zoom 1.3. Defaults to 0.3.
   */
  blurFalloffRange?: number;
}

/**
 * The game camera. Wraps every `camera` host API call so callers work with an
 * object (`camera.setZoom(...)`) instead of threading free functions — mirroring
 * how {@link Sound} wraps the `sound` API.
 *
 * The camera also owns a {@link TiltShift} filter, because the two things a
 * tilt-shift naturally tracks are both the camera's: its focus band `y` follows
 * the camera target, and its blur is driven by zoom — inversely correlated to
 * how far you've zoomed in (zoomed-in reads as "in focus", so blur falls off).
 * Both are pushed every {@link tick}.
 *
 * A singleton: instantiated by the bundler (`__internal__init`) and ticked via
 * {@link globalTicker}, which the host drives each frame.
 */
export class Camera {
  private _tiltShift: TiltShift;
  private _baseBlur: number;
  private _blurFalloffRange: number;

  constructor(opts: CameraOpts = {}) {
    this._baseBlur = opts.blur ?? 0.06;
    this._blurFalloffRange = opts.blurFalloffRange ?? 0.3;
    this._tiltShift = new TiltShift({ blur: this._baseBlur });
    globalTicker.subscribe((deltaMs) => this.tick(deltaMs));
  }

  /**
   * The tilt-shift effect owned by the camera. Its `blur` and `y` are driven
   * every tick, so set them here only for things the camera doesn't manage
   * (e.g. `influence`).
   */
  get tiltShift(): TiltShift {
    return this._tiltShift;
  }

  /** Base tilt-shift blur at zoom 1.0. */
  get baseBlur(): number {
    return this._baseBlur;
  }
  set baseBlur(blur: number) {
    this._baseBlur = blur;
  }

  /** Zoom-in amount over which blur falls from its base to 0. */
  get blurFalloffRange(): number {
    return this._blurFalloffRange;
  }
  set blurFalloffRange(range: number) {
    this._blurFalloffRange = range;
  }

  // ---- Wrapped host camera API ----

  setPosition(x: number, y: number): void {
    camera.setPosition(x, y);
  }

  getEffectiveZoom(): number {
    return camera.getEffectiveZoom();
  }

  getZoom(): number {
    return camera.getUserZoom();
  }

  setZoom(scale: number): void {
    camera.setUserZoom(scale);
  }

  localTransform(): Matrix {
    return camera.localTransform();
  }

  worldTransform(): Matrix {
    return camera.worldTransform();
  }

  getFrame(): number[] {
    return camera.getFrame();
  }

  setTarget(getTarget: CameraTargetFn): void {
    camera.setTarget(getTarget);
  }

  getTarget(): Vector2 {
    return camera.getTarget();
  }

  setOffset(pos: Vector2 | null): void {
    camera.setOffset(pos);
  }

  shake(opts: ShakeOpts): void {
    camera.shake(opts);
  }

  /**
   * Drives the owned tilt-shift from the camera's current state. Called every
   * frame via {@link globalTicker}; `deltaMs` is unused for now.
   */
  tick(_deltaMs: number): void {
    this._tiltShift.y = this.getTarget().y;
    const t = 1 - (this.getEffectiveZoom() - 1) / this._blurFalloffRange;
    this._tiltShift.blur = this._baseBlur * Math.max(0, Math.min(1, t));
  }
}
