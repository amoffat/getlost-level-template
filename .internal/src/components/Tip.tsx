import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { actions as uiActions } from "@/slices/ui";
import { Alert, Button, Group, Text, Transition } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { randIndex, randIndexAvoid, randIndexAvoidMany } from "../utils/rand";

export interface TipProps {
  /**
   * Array of tip strings to display.
   */
  tips: ReactNode[];
  /**
   * Time in milliseconds between automatic tip changes. Set to 0 or a negative number to disable auto-advance.
   * Defaults to 10s.
   */
  intervalSeconds?: number;
  /**
   * Optional className for the root Alert.
   */
  className?: string;
}

/**
 * Tip component that cycles through an array of tips with a fade transition.
 * Includes controls for manually advancing to the next tip and a placeholder "Help" button.
 */
export default function Tip({
  tips,
  intervalSeconds = 10,
  className,
}: TipProps) {
  // Pick a random starting tip on first mount
  const count = tips.length;
  const [index, setIndex] = useState(() => (count > 0 ? randIndex(count) : 0));
  const collapsed = useAppSelector((state) => state.ui.tipCollapsed);
  const dispatch = useAppDispatch();
  const [mounted, setMounted] = useState(true);
  const intervalMs = intervalSeconds * 1000;
  const seenRef = useRef<Set<number>>(new Set());

  // Keep a stable duration used for in/out transitions
  const fadeDuration = 200;
  const timerRef = useRef<number | null>(null);

  // Ensure index stays in range if tips array size changes
  useEffect(() => {
    if (count === 0) {
      setIndex(0);
    } else if (index >= count) {
      setIndex(count - 1);
    }
    // prune seen indices that are now out of range
    const seen = seenRef.current;
    for (const v of Array.from(seen)) {
      if (v < 0 || v >= count) seen.delete(v);
    }
  }, [count, index]);

  // Ensure initial index is considered seen
  useEffect(() => {
    if (count > 0 && index >= 0 && index < count) {
      const seen = seenRef.current;
      if (!seen.has(index)) seen.add(index);
    }
  }, [count, index]);

  // Pick next index such that we randomly cycle through all items before repeating
  const pickNext = useCallback(
    (prev: number) => {
      if (count <= 1) return 0;
      const seen = seenRef.current;
      // If we've seen everything, start a new cycle but avoid immediate repeat of prev
      if (seen.size >= count) {
        seen.clear();
        if (prev >= 0 && prev < count) seen.add(prev);
      }
      const next = randIndexAvoidMany(count, seen);
      if (next !== -1) return next;
      // Fallback: avoid only the previous index
      return randIndexAvoid(count, prev);
    },
    [count]
  );

  const advance = useCallback(() => {
    if (count <= 1 || collapsed) return; // nothing to advance or hidden
    // fade out then switch content then fade in
    setMounted(false);
    setTimeout(() => {
      const prev = index;
      const next = pickNext(prev);
      setIndex(next);
      // mark seen
      seenRef.current.add(next);
      setMounted(true);
    }, fadeDuration);
  }, [count, index, pickNext, collapsed]);

  // Auto-advance handling
  useEffect(() => {
    if (count <= 1 || intervalMs <= 0 || collapsed) return;
    // Clear any existing
    if (timerRef.current) clearTimeout(timerRef.current);

    const tick = () => {
      advance();
      timerRef.current = setTimeout(tick, intervalMs) as unknown as number;
    };

    timerRef.current = setTimeout(tick, intervalMs) as unknown as number;

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [advance, intervalMs, count, index, collapsed]);

  if (count === 0) {
    return null;
  }

  const icon = <IconInfoCircle />;
  return (
    <Alert
      withCloseButton={!collapsed}
      onClose={() => dispatch(uiActions.setTipCollapsed(true))}
      className={className}
      color="orange"
      icon={icon}
      variant="light"
      p="xs"
    >
      {collapsed ? (
        <Group justify="flex-end" gap="xs" wrap="nowrap">
          <Button
            variant="subtle"
            size="compact-xs"
            onClick={() => dispatch(uiActions.setTipCollapsed(false))}
            aria-label="Show tips"
          >
            Show tips
          </Button>
        </Group>
      ) : (
        <>
          <div aria-live="polite" role="status">
            <Transition
              mounted={mounted}
              transition="fade-right"
              duration={fadeDuration}
              timingFunction="ease-out"
            >
              {(styles) => (
                <Text size="sm" style={styles}>
                  {tips[index]}
                </Text>
              )}
            </Transition>
          </div>

          <Group justify="flex-end" gap="xs" wrap="nowrap" mt="xs">
            {count > 1 && (
              <Button
                variant="subtle"
                size="compact-xs"
                onClick={advance}
                aria-label="Show next tip"
              >
                Next tip
              </Button>
            )}
            <Button variant="light" size="compact-xs" aria-label="Help button">
              Help
            </Button>
          </Group>
        </>
      )}
    </Alert>
  );
}
