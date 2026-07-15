import * as camera from "@gl/api/camera";
import { TiltShift } from "@gl/fx";
import { globalTicker } from "@gl/ticker";
import type { Vector2 } from "@gl/types/api/vector";
import type { CameraTarget, CameraTargetFn, Frame } from "@gl/types/camera";
import { Matrix } from "@gl/utils/mat";

export interface ShakeOpts {
  magnitude?: number;
  durationMs?: number;
  easing?: string;
  speed?: number;
}

export interface CameraOpts {
  /**
   * Base tilt-shift blur when all targets sit at the same y. Falls off linearly
   * to 0 as the targets' y-spread grows toward {@link CameraOpts.blurSpreadFalloff}
   * of the frame height. Defaults to 0.06.
   */
  blur?: number;
  /**
   * The fraction of the camera frame's height (0–1) the targets must span
   * vertically for blur to reach 0. e.g. with the default 0.6, blur is fully
   * faded out once the targets are spread across 60% of the frame's height —
   * so both stay in focus. Defaults to 0.6.
   */
  blurSpreadFalloff?: number;
}

/**
 * The game camera. Wraps every `camera` host API call so callers work with an
 * object (`camera.setZoom(...)`) instead of threading free functions — mirroring
 * how {@link Sound} wraps the `sound` API.
 *
 * The camera also owns a {@link TiltShift} filter, because the two things a
 * tilt-shift naturally tracks are both the camera's: its focus band `y` follows
 * the camera target, and its blur is driven by how spread apart the targets
 * are in screen space — clustered targets read as one focal point (blur up),
 * while targets spread across the screen need to stay in focus (blur down).
 * Both are pushed every {@link tick}.
 *
 * A singleton: instantiated by the bundler (`__internal__init`) and ticked via
 * {@link globalTicker}, which the host drives each frame.
 */
export class Camera {
  private _tiltShift: TiltShift;
  private _baseBlur: number;
  private _blurSpreadFalloff: number;

  constructor(opts: CameraOpts = {}) {
    this._baseBlur = opts.blur ?? 0.08;
    this._blurSpreadFalloff = opts.blurSpreadFalloff ?? 0.8;
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

  /** Base tilt-shift blur when the targets' y-spread is 0. */
  get baseBlur(): number {
    return this._baseBlur;
  }
  set baseBlur(blur: number) {
    this._baseBlur = blur;
  }

  /** Fraction of frame height (0–1) the targets span at which blur reaches 0. */
  get blurSpreadFalloff(): number {
    return this._blurSpreadFalloff;
  }
  set blurSpreadFalloff(fraction: number) {
    this._blurSpreadFalloff = fraction;
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
    return Matrix.fromArray(camera.localTransform());
  }

  worldTransform(): Matrix {
    return Matrix.fromArray(camera.worldTransform());
  }

  getFrame(): Frame {
    return camera.getFrame();
  }

  setPlayerTarget(): void {
    this.setTarget(() => [{ weight: 1, pos: player.getCenterOfMass() }]);
  }

  setTarget(getTarget: CameraTargetFn): void {
    camera.setTarget(getTarget);
  }

  getTarget(): Vector2 {
    return camera.getTarget();
  }

  getTargets(): CameraTarget[] {
    return camera.getTargets();
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

    // Drive blur from how much of the frame the targets span vertically: the
    // wider their y-spread (relative to the frame height), the less blur, so
    // spread-out characters stay in focus. getFrame() is world space, matching
    // the targets' world-space positions.
    const ys = this.getTargets()
      .filter((target) => target.weight > 0)
      .map((target) => target.pos.y);

    const frameHeight = this.getFrame().height;
    const range = ys.length >= 2 ? Math.max(...ys) - Math.min(...ys) : 0;
    const spread = frameHeight > 0 ? range / frameHeight : 0;
    const t = 1 - spread / this._blurSpreadFalloff;
    this._tiltShift.blur = this._baseBlur * Math.max(0, Math.min(1, t));
  }
}
