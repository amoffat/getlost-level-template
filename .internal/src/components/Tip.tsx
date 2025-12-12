import { STORAGE_KEYS } from "@/constants/localStorage";
import { useLocalStorageToggle } from "@/hooks/useLocalStorageToggle";
import { Alert, Button, Group, Text, Transition } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import {
  memo,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

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
  /**
   * Number of lines to reserve for the tip text when collapsed. The tip area will be exactly this tall.
   * Defaults to 3.
   */
  lines?: number;
}

/**
 * Tip component that cycles through an array of tips with a fade transition.
 * Includes controls for manually advancing to the next tip and a placeholder
 * "Help" button.
 *
 * The Tip component is often displayed in other components so we memoize it to
 * avoid unnecessary re-renders.
 */
const Tip = memo(
  ({ tips, intervalSeconds = 10, className, lines = 3 }: TipProps) => {
    const count = tips.length;
    // Start from the first tip and iterate predictably
    const [index, setIndex] = useState(0);
    const [mounted, setMounted] = useState(true);

    // Initialize collapsed state from localStorage, defaulting to false (tips shown)
    const [collapsed, toggleCollapsed] = useLocalStorageToggle(
      STORAGE_KEYS.TIPS_COLLAPSED,
      false
    );
    const intervalMs = intervalSeconds * 1000;
    const [expanded, setExpanded] = useState(false);
    const [isTruncated, setIsTruncated] = useState(false);
    const [reservedHeight, setReservedHeight] = useState<string | undefined>(
      undefined
    );

    // Measure text metrics to compute exact N-line height and whether content is truncated
    const textRef = useRef<HTMLDivElement | null>(null);

    // Keep a stable duration used for in/out transitions
    const fadeDuration = 200;
    const timerRef = useRef<number | null>(null);

    // Ensure index stays in range if tips array size changes
    useEffect(() => {
      if (count === 0) {
        queueMicrotask(() => setIndex(0));
      } else if (index >= count) {
        // Wrap to the beginning if current index is out of range
        queueMicrotask(() => setIndex(0));
      }
    }, [count, index]);

    // Pick next index sequentially and wrap to the start
    const pickNext = useCallback(
      (prev: number) => {
        if (count <= 1) return 0;
        return (prev + 1) % count;
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

    // Recalculate reserved height based on actual computed styles
    useEffect(() => {
      if (!textRef.current) return;
      const el = textRef.current;
      const styles = getComputedStyle(el);
      // Mantine applies line-height as unitless or in px; parse both
      const fontSizePx = parseFloat(styles.fontSize || "14");
      const lineHeightRaw = styles.lineHeight;
      let lineHeightPx: number;
      if (lineHeightRaw.endsWith("px")) {
        lineHeightPx = parseFloat(lineHeightRaw);
      } else {
        // unitless multiplier
        const multiplier = parseFloat(lineHeightRaw || "1.55");
        lineHeightPx = multiplier * fontSizePx;
      }
      const target = Math.ceil(lineHeightPx * lines);
      queueMicrotask(() => setReservedHeight(`${target}px`));
    }, [lines, index, mounted]);

    // Detect truncation when not expanded
    useEffect(() => {
      const el = textRef.current;
      if (!el) return;
      if (expanded) {
        queueMicrotask(() => setIsTruncated(false));
        return;
      }
      // Give layout a tick after transitions
      const id = window.setTimeout(() => {
        try {
          const truncated = el.scrollHeight - 1 > el.clientHeight; // tolerance
          setIsTruncated(truncated);
        } catch {
          setIsTruncated(false);
        }
      }, 0);
      return () => window.clearTimeout(id);
    }, [index, tips, expanded, reservedHeight, mounted]);

    // Reset expansion when changing tip
    useEffect(() => {
      queueMicrotask(() => setExpanded(false));
    }, [index]);

    const icon = useMemo(() => <IconInfoCircle />, []);

    if (count === 0) {
      return null;
    }

    return (
      <Alert
        withCloseButton={!collapsed}
        onClose={toggleCollapsed}
        className={className}
        color="green"
        icon={icon}
        variant="light"
        p="xs"
      >
        {collapsed ? (
          <Group justify="flex-end" gap="xs" wrap="nowrap">
            <Button
              variant="subtle"
              size="compact-xs"
              onClick={toggleCollapsed}
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
                  <div
                    style={{
                      ...styles,
                      height: expanded
                        ? undefined
                        : (reservedHeight ??
                          `calc(var(--mantine-font-size, 14px) * var(--mantine-line-height, 1.55) * ${lines})`),
                      overflow: expanded ? undefined : "hidden",
                    }}
                  >
                    <Text
                      ref={textRef as any}
                      size="sm"
                      // Use lineClamp to provide proper ellipsis when collapsed
                      lineClamp={expanded ? undefined : lines}
                    >
                      {tips[index]}
                    </Text>
                  </div>
                )}
              </Transition>
            </div>

            <Group justify="flex-end" gap="xs" wrap="nowrap" mt="xs">
              {!expanded && isTruncated && (
                <Button
                  variant="subtle"
                  size="compact-xs"
                  onClick={() => setExpanded(true)}
                  aria-label="Expand tip"
                >
                  Expand
                </Button>
              )}
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
            </Group>
          </>
        )}
      </Alert>
    );
  }
);

export default Tip;
