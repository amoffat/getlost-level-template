import { Vector } from "@/vec";
import { Menu } from "@mantine/core";

interface ObjectMenuProps {
  pos: Vector | null;
  opened: boolean;
  children: React.ReactNode;
}

export default function ObjectMenu({ pos, opened, children }: ObjectMenuProps) {
  if (!pos) return null;

  return (
    <Menu shadow="md" width={200} opened={opened} position="top" withArrow>
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
