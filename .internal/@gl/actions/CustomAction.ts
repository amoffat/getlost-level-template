import { Action } from "@gl/utils/behavior";
import { Easings, type EasingFunction } from "@gl/utils/easing";

type CustomStartEnd<Subject> = (args: { subject: Subject }) => void;
type CustomTick<Subject> = (args: {
  subject: Subject;
  progress: number; // easing-adjusted, 0..1
  elapsed: number; // raw elapsed ms
}) => void;

/**
 * A free-form {@link Action} that runs arbitrary callbacks over a fixed
 * duration. The base Action's internal animator tracks the duration and
 * reports completion, so this action is "done" once `durationMs` elapses
 * regardless of what its callbacks are doing. Use `durationMs: 0` for an
 * instantaneous one-off callback (both `onStart` and `onEnd` fire on the
 * first tick).
 */
export class CustomAction<Subject = unknown> extends Action<Subject> {
  private readonly _onStart?: CustomStartEnd<Subject>;
  private readonly _onTick?: CustomTick<Subject>;
  private readonly _onEnd?: CustomStartEnd<Subject>;

  constructor({
    name = "custom",
    durationMs = 0,
    easing = Easings.linear,
    onStart,
    onTick,
    onEnd,
  }: {
    name?: string;
    durationMs?: number;
    easing?: EasingFunction;
    onStart?: CustomStartEnd<Subject>;
    onTick?: CustomTick<Subject>;
    onEnd?: CustomStartEnd<Subject>;
  }) {
    super({ name, durationMs, easing });
    this._onStart = onStart;
    this._onTick = onTick;
    this._onEnd = onEnd;
  }

  public override onActionStart({ subject }: { subject: Subject }): void {
    this._onStart?.({ subject });
  }

  public override tick({
    subject,
    progress,
    elapsed,
  }: {
    subject: Subject;
    progress: number;
    elapsed: number;
  }): void {
    this._onTick?.({ subject, progress, elapsed });
  }

  public override onActionEnd({ subject }: { subject: Subject }): void {
    this._onEnd?.({ subject });
  }
}
