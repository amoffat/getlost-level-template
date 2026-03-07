import { Animator } from "../utils/animation";
import { Action, type Entity } from "../utils/behavior";
import { type EasingFunction, Easings } from "../utils/easing";

export class JumpAction extends Action {
  private readonly _name: string;

  public get name(): string {
    return this._name;
  }

  private _animator: Animator;
  private _direction: { x: number; y: number };
  private _startX: number = 0;
  private _startY: number = 0;
  private _started: boolean = false;

  /**
   * @param duration   Duration of the jump in milliseconds.
   * @param curve      Easing applied to the 0→1 animator progress before the
   *                   arc transform. Controls timing feel; defaults to
   *                   `jumpGravity` for a fast-rise / fast-fall game feel.
   * @param direction  Vector defining the jump axis and magnitude. The
   *                   magnitude of the vector determines peak displacement
   *                   (pixels). `y` is the upward component (screen-Y is
   *                   inverted automatically), `x` moves the character
   *                   forward/backward simultaneously.
   *                   Defaults to `{x:0, y:100}` for a 100px vertical jump.
   */
  constructor({
    name = "jump",
    duration = 600,
    curve = Easings.jumpGravity,
    direction = { x: 0, y: 100 },
  }: {
    name?: string;
    duration?: number;
    curve?: EasingFunction;
    direction?: { x: number; y: number };
  } = {}) {
    super();
    this._name = name;
    this._direction = direction;
    this._animator = new Animator({
      durationMs: duration,
      forwardCurve: curve,
    });
  }

  public tick(subject: Entity, delta: number): boolean {
    if (!this._started) {
      const pos = subject.getPos();
      this._startX = pos.x;
      this._startY = pos.y;
      this._started = true;
      this._animator.play();
    }

    this._animator.tick(delta);

    // Parabolic arc: peaks at t=0.5, returns to origin at t=1.
    // The animator's value (0→1, shaped by `curve`) drives the arc factor.
    // Direction magnitude sets peak displacement; y offsets upward (screen-Y
    // inverted), x allows angled jumps that move the character forward/backward.
    const t = this._animator.value;
    const arc = 4 * t * (1 - t);
    subject.setPos(
      this._startX + this._direction.x * arc,
      this._startY - this._direction.y * arc,
    );

    if (!this._animator.isAnimating) {
      this._started = false;
      return true;
    }
    return false;
  }
}
