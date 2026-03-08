import { Animator } from "../utils/animation";
import { Action, type Entity } from "../utils/behavior";
import { type EasingFunction, Easings } from "../utils/easing";

interface DashParams {
  distance?: number;
}
export class DashAction extends Action<DashParams> {
  private readonly _name: string;

  public get name(): string {
    return this._name;
  }

  private _animator: Animator;
  private _distance: number;
  private _startX: number = 0;
  private _startY: number = 0;
  private _started: boolean = false;

  /**
   * @param duration  Duration of the dash in milliseconds.
   * @param distance  Horizontal distance (pixels) to travel.
   * @param curve     Easing applied to the 0→1 progress, controlling how the
   *                  displacement accelerates/decelerates (default: easeOutQuad
   *                  for a quick burst that naturally decelerates).
   */
  constructor({
    name = "dash",
    duration = 200,
    distance = 150,
    curve = Easings.easeOutQuad,
  }: {
    name?: string;
    duration?: number;
    distance?: number;
    curve?: EasingFunction;
  } = {}) {
    super();
    this._name = name;
    this._distance = distance;
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
    params: DashParams;
  }): boolean {
    if (!this._started) {
      const pos = subject.getPos();
      this._startX = pos.x;
      this._startY = pos.y;
      this._started = true;
      this._animator.play();
    }

    const distance = params.distance ?? this._distance;

    this._animator.tick(delta);
    subject.setPos(
      this._startX + this._animator.value * distance,
      this._startY,
    );

    if (!this._animator.isAnimating) {
      this._started = false;
      return true;
    }
    return false;
  }
}
