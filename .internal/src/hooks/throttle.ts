// useMakeRafDispatcher.ts
import type { Action } from "@reduxjs/toolkit";
import { useEffect, useMemo, useRef } from "react";
import { useDispatch } from "react-redux";
import { createRafThrottled } from "../utils/throttle";

/** An RTK-style action creator with a stable `type` */
type ActionCreator<Args extends any[] = any[]> = ((...args: Args) => Action) & {
  type: string;
};

type RafDispatcher<AC extends ActionCreator<any[]>> = ((
  ...args: Parameters<AC>
) => void) & {
  /** Force-dispatch the latest queued args now (if any) */
  flush: () => void;
  /** Drop any queued call and cancel the scheduled frame */
  cancel: () => void;
};

/**
 * useMakeRafDispatcher
 * Throttles an RTK action creator to at most 1 dispatch per rAF (~60hz).
 * The hook is bound to a single action type via the passed-in action creator.
 */
export function useMakeRafDispatcher<AC extends ActionCreator>(
  actionCreator: AC
): RafDispatcher<AC> {
  const dispatch = useDispatch();
  const mountedRef = useRef(true);

  // Build a throttled dispatcher bound to this action creator.
  const throttled = useMemo(
    () =>
      createRafThrottled((...args: Parameters<AC>) => {
        if (!mountedRef.current) return;
        dispatch(actionCreator(...args));
      }),
    [dispatch, actionCreator]
  );

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      throttled.cancel();
    };
  }, [throttled]);

  return throttled as RafDispatcher<AC>;
}
