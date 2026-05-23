import { Popover, type PopoverProps } from "@mantine/core";
import React, { useCallback, useEffect, useRef, useState } from "react";

/**
 * DynamicHoverCard
 *
 * Renders a Mantine Popover dropdown anchored to arbitrary viewport coordinates
 * (x, y). Useful for context menus, inspector hovers, or any UI that should
 * appear at a specific screen point.
 *
 * Coordinates are treated as viewport pixels (position: fixed), measured from
 * the top-left corner of the window.
 *
 * If `autoHideDelay` is provided, the card auto-dismisses after that many
 * milliseconds when the mouse is not hovering over it. Mouse enter pauses the
 * countdown; mouse leave restarts it. Callers should pass a `key` prop that
 * changes whenever the anchor position changes so the component remounts and
 * the countdown resets.
 */
interface DynamicHoverCardProps extends Omit<
  PopoverProps,
  "children" | "opened"
> {
  x: number;
  y: number;
  opened: boolean;
  children: React.ReactNode;
  autoHideDelay?: number;
}

export function DynamicHoverCard({
  x,
  y,
  opened,
  children,
  autoHideDelay,
  // sensible defaults that mirror the previous behavior
  position = "right-start",
  middlewares = { shift: true, flip: true },
  ...popoverProps
}: DynamicHoverCardProps) {
  // `dismissed` flips to true when the auto-hide timer fires.
  // Final visibility is derived: opened && !dismissed, so no setState-in-effect needed.
  const [dismissed, setDismissed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    if (autoHideDelay == null) return;
    clearTimer();
    timerRef.current = setTimeout(() => setDismissed(true), autoHideDelay);
  }, [autoHideDelay, clearTimer]);

  // Start the auto-hide timer when the card first becomes visible.
  // Timer fires asynchronously, so setDismissed is never called synchronously inside an effect.
  useEffect(() => {
    if (opened && autoHideDelay != null) startTimer();
    return clearTimer;
  }, [opened, autoHideDelay, startTimer, clearTimer]);

  const handleMouseEnter = useCallback(() => clearTimer(), [clearTimer]);
  const handleMouseLeave = useCallback(() => startTimer(), [startTimer]);

  return (
    <Popover
      key={`${x}-${y}`} // force remount when coordinates change
      opened={opened && !dismissed}
      position={position}
      middlewares={middlewares}
      {...popoverProps}
    >
      <Popover.Target>
        {/* Invisible fixed-position anchor at the requested viewport coordinates */}
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            top: y,
            left: x,
            width: 0,
            height: 0,
            pointerEvents: "none",
          }}
        />
      </Popover.Target>
      <Popover.Dropdown
        p={"xs"}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </Popover.Dropdown>
    </Popover>
  );
}
