// Core rAF-throttling utilities that work in any (non-React) context.
// Assumes requestAnimationFrame/cancelAnimationFrame are available in the environment.

export type RafThrottled<F extends (...args: any[]) => void> = ((
  ...args: Parameters<F>
) => void) & {
  /** Force-run the latest queued args now (if any) */
  flush: () => void;
  /** Drop any queued call and cancel the scheduled frame */
  cancel: () => void;
};

/**
 * createRafThrottled
 * Wrap any function so it runs at most once per animation frame, always with the latest args.
 */
export function createRafThrottled<F extends (...args: any[]) => void>(
  fn: F
): RafThrottled<F> {
  let frame = 0;
  let latestArgs: Parameters<F> | null = null;

  const flush = () => {
    const args = latestArgs;
    frame = 0;
    latestArgs = null;
    if (!args) return;
    fn(...args);
  };

  const schedule = (...args: Parameters<F>) => {
    latestArgs = args;
    if (!frame) {
      frame = requestAnimationFrame(flush);
    }
  };

  const cancel = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    latestArgs = null;
  };

  return Object.assign(schedule, { flush, cancel }) as RafThrottled<F>;
}
