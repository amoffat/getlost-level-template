import { Animator } from "../utils/animation";
import { Action, type Entity } from "../utils/behavior";
import { type EasingFunction, Easings } from "../utils/easing";

interface JumpParams {
  direction?: { x: number; y: number };
  height?: number;
}

export class JumpAction extends Action<JumpParams> {
  private readonly _name: string;

  public get name(): string {
    return this._name;
  }

  private _animator: Animator;
  private _direction: { x: number; y: number };
  private _height: number;
  private _startX: number = 0;
  private _startY: number = 0;
  private _startHeight: number = 0;
  private _started: boolean = false;

  /**
   * @param duration   Duration of the jump in milliseconds.
   * @param curve      Easing applied to the 0→1 animator progress before the
   *                   arc transform. Controls timing feel; defaults to
   *                   `jumpGravity` for a fast-rise / fast-fall game feel.
   * @param height     Peak height of the jump in pixels, applied via the
   *                   entity's `setHeight` as a parabolic arc (peaks at
   *                   t=0.5, returns to origin at t=1). This controls how
   *                   high above the ground the entity rises during the jump.
   *                   Defaults to `100`.
   * @param direction  Ground-plane displacement vector. The entity's ground
   *                   position (`setPos`) is linearly interpolated from start
   *                   to `start + direction` over the jump duration. Use this
   *                   for forward/backward/lateral movement along the 2.5D
   *                   ground while airborne.
   *                   Defaults to `{x:0, y:0}` (jump in place).
   */
  constructor({
    name = "jump",
    duration = 600,
    curve = Easings.jumpGravity,
    height = 100,
    direction = { x: 0, y: 0 },
  }: {
    name?: string;
    duration?: number;
    curve?: EasingFunction;
    height?: number;
    direction?: { x: number; y: number };
  } = {}) {
    super();
    this._name = name;
    this._height = height;
    this._direction = direction;
    this._animator = new Animator({
      durationMs: duration,
      forwardCurve: curve,
    });
  }

  public tick({
    subject,
    delta,
    params,
  }: {
    subject: Entity;
    delta: number;
    params: JumpParams;
  }): boolean {
    if (!this._started) {
      const pos = subject.getPos();
      this._startX = pos.x;
      this._startY = pos.y;
      this._startHeight = subject.getHeight();
      this._started = true;
      this._animator.play();
    }

    const direction = params.direction ?? this._direction;
    const height = params.height ?? this._height;

    this._animator.tick(delta);

    const t = this._animator.value;

    // Parabolic arc for height above ground: peaks at t=0.5, returns to
    // origin at t=1. Applied via setHeight so the entity visually lifts
    // off the ground plane in 2.5D.
    const arc = 4 * t * (1 - t);
    subject.setHeight(this._startHeight + height * arc);

    // Linear interpolation for ground-plane position: moves the entity's
    // shadow/feet along the 2.5D ground from start toward start+direction.
    subject.setPos(
      this._startX + direction.x * t,
      this._startY + direction.y * t,
    );

    if (!this._animator.isAnimating) {
      this._started = false;
      return true;
    }
    return false;
  }
}
