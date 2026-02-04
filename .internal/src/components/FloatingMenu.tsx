import { Vector2 } from "@/vec";
import { Menu, MenuProps } from "@mantine/core";

interface FloatingMenuProps {
  pos: Vector2 | null;
  opened: boolean;
  children: React.ReactNode;
  shadow?: MenuProps["shadow"];
  position?: MenuProps["position"];
  withArrow?: MenuProps["withArrow"];
  width?: number | string;
}

export default function FloatingMenu({
  pos,
  opened,
  children,
  shadow = "md",
  position = "top",
  withArrow = false,
  width = 200,
}: FloatingMenuProps) {
  if (!pos) return null;

  return (
    <Menu
      shadow={shadow}
      width={width}
      opened={opened}
      position={position}
      withArrow={withArrow}
    >
      <Menu.Target>
        <div
          // Key forces the target element to remount when coordinates change,
          // prompting Mantine/Floating UI to recalculate dropdown position
          key={`${pos.x}-${pos.y}`}
          aria-hidden="true"
          style={{
            position: "fixed",
            top: pos.y,
            left: pos.x,
            width: 0,
            height: 0,
            pointerEvents: "none",
          }}
        />
      </Menu.Target>

      <Menu.Dropdown>{children}</Menu.Dropdown>
    </Menu>
  );
}
