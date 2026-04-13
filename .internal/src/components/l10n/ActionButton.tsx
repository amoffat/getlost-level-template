import { ActionIcon, ActionIconProps, Tooltip } from "@mantine/core";
import { ReactNode } from "react";

interface ActionButtonProps {
  tooltip: string;
  icon: ReactNode;
  onClick: () => void;
  size?: ActionIconProps["size"];
  variant?: ActionIconProps["variant"];
  disabled?: boolean;
}

/**
 * A small icon button with an accessible tooltip. Composes Mantine's
 * `ActionIcon` and `Tooltip` into a single reusable unit.
 */
export default function ActionButton({
  tooltip,
  icon,
  onClick,
  size = "xs",
  variant = "default",
  disabled,
}: ActionButtonProps) {
  return (
    <Tooltip label={tooltip} withArrow>
      <ActionIcon
        size={size}
        variant={variant}
        onClick={onClick}
        disabled={disabled}
      >
        {icon}
      </ActionIcon>
    </Tooltip>
  );
}
