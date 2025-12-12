import { Popover, type PopoverProps } from "@mantine/core";
import React from "react";

/**
 * DynamicHoverCard
 *
 * Renders a Mantine Popover dropdown anchored to arbitrary viewport coordinates (x, y).
 * Useful for context menus, inspector hovers, or any UI that should appear at a specific screen point.
 *
 * Coordinates are treated as viewport pixels (position: fixed), measured from the top-left corner of the window.
 */
interface DynamicHoverCardProps extends Omit<
  PopoverProps,
  "children" | "opened"
> {
  x: number;
  y: number;
  opened: boolean;
  children: React.ReactNode;
}

export function DynamicHoverCard({
  x,
  y,
  opened,
  children,
  // sensible defaults that mirror the previous behavior
  position = "right-start",
  middlewares = { shift: true, flip: true },
  ...popoverProps
}: DynamicHoverCardProps) {
  return (
    <Popover
      key={`${x}-${y}`} // force remount when coordinates change
      opened={opened}
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
      <Popover.Dropdown p={"xs"}>{children}</Popover.Dropdown>
    </Popover>
  );
}
