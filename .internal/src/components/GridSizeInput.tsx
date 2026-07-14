import { Vector2 } from "@/vec";
import { ActionIcon, Group, NumberInput, Tooltip } from "@mantine/core";
import { IconLock, IconLockOpen } from "@tabler/icons-react";
import { useState } from "react";

type GridSizeInputProps = {
  value: Vector2;
  onChange: (size: Vector2) => void;
};

const stepHoldInterval = (t: number) => Math.max(1000 / t ** 2, 25);

/**
 * Two linked Width/Height inputs for a tileset's grid size. The inputs start
 * "locked" (square): editing either axis updates both. Toggling the lock off
 * allows independent width/height. Re-locking snaps the height back to the
 * width, returning to a square tile.
 */
export default function GridSizeInput({ value, onChange }: GridSizeInputProps) {
  const [locked, setLocked] = useState(true);

  const changeWidth = (raw: number | string) => {
    if (raw === "" || typeof raw === "string") return;
    onChange(locked ? { x: raw, y: raw } : { x: raw, y: value.y });
  };

  const changeHeight = (raw: number | string) => {
    if (raw === "" || typeof raw === "string") return;
    onChange(locked ? { x: raw, y: raw } : { x: value.x, y: raw });
  };

  const toggleLock = () => {
    setLocked((wasLocked) => {
      const nowLocked = !wasLocked;
      // Re-locking snaps height to width, returning to a square tile.
      if (nowLocked && value.x !== value.y) {
        onChange({ x: value.x, y: value.x });
      }
      return nowLocked;
    });
  };

  const commonProps = {
    placeholder: "Pixels",
    min: 4,
    max: 256,
    clampBehavior: "blur" as const,
    allowDecimal: false,
    stepHoldDelay: 500,
    stepHoldInterval,
  };

  return (
    <Group gap="xs" align="flex-end" wrap="nowrap">
      <NumberInput
        label="Width"
        value={value.x}
        onChange={changeWidth}
        {...commonProps}
      />
      <Tooltip label={locked ? "Unlock to set width/height separately" : "Lock to a square"}>
        <ActionIcon
          variant="subtle"
          color="gray"
          onClick={toggleLock}
          aria-label={locked ? "Unlock aspect ratio" : "Lock aspect ratio"}
          mb={4}
        >
          {locked ? <IconLock size={16} /> : <IconLockOpen size={16} />}
        </ActionIcon>
      </Tooltip>
      <NumberInput
        label="Height"
        value={value.y}
        onChange={changeHeight}
        {...commonProps}
      />
    </Group>
  );
}
