import { Vector2 } from "@/vec";
import { Box, Group, NumberInput, Stack } from "@mantine/core";
import { useMove } from "@mantine/hooks";
import { ReactElement, useCallback, useState } from "react";
import PropertyValue, {
  OnValueChangeArgs,
  PropertyValueInfo,
} from "../../PropertyValue";
import classes from "./Vector2Input.module.css";

interface Vector2PlaneWidgetProps {
  defaultValue?: Vector2;
  onChange: (v: Vector2) => void;
  xRange: [number, number];
  yRange: [number, number];
  snapInterval?: number;
  snapToZero?: boolean;
  snapThreshold?: number;
}

function worldToNorm(world: number, range: [number, number]): number {
  return (world - range[0]) / (range[1] - range[0]);
}

function normToWorld(norm: number, range: [number, number]): number {
  return range[0] + norm * (range[1] - range[0]);
}

function applySnap(
  world: number,
  range: [number, number],
  snapInterval?: number,
  snapToZero?: boolean,
  snapThreshold?: number,
): number {
  let v = world;
  const threshold = snapThreshold ?? Math.abs(range[1] - range[0]) * 0.03;

  if (snapInterval) {
    v = Math.round(v / snapInterval) * snapInterval;
  }

  if (snapToZero && Math.abs(world) <= threshold) {
    v = 0;
  }

  return Math.max(range[0], Math.min(range[1], v));
}

function Vector2PlaneWidget({
  defaultValue = { x: 0, y: 0 },
  onChange,
  xRange,
  yRange,
  snapInterval,
  snapToZero,
  snapThreshold,
}: Vector2PlaneWidgetProps) {
  const [position, setPosition] = useState<Vector2>(defaultValue);

  const handleMove = useCallback(
    ({ x, y }: { x: number; y: number }) => {
      const rawX = normToWorld(x, xRange);
      const rawY = normToWorld(y, yRange);
      const snappedX = applySnap(
        rawX,
        xRange,
        snapInterval,
        snapToZero,
        snapThreshold,
      );
      const snappedY = applySnap(
        rawY,
        yRange,
        snapInterval,
        snapToZero,
        snapThreshold,
      );
      const newPos = { x: snappedX, y: snappedY };
      setPosition(newPos);
      onChange(newPos);
    },
    [xRange, yRange, snapInterval, snapToZero, snapThreshold, onChange],
  );

  const { ref, active } = useMove(handleMove);

  const normX = Math.max(0, Math.min(1, worldToNorm(position.x, xRange)));
  const normY = Math.max(0, Math.min(1, worldToNorm(position.y, yRange)));

  const zeroNormX = worldToNorm(0, xRange);
  const zeroNormY = worldToNorm(0, yRange);

  const handleXChange = useCallback(
    (val: number | string) => {
      if (val === "" || typeof val === "string") return;
      const snapped = applySnap(
        val,
        xRange,
        snapInterval,
        snapToZero,
        snapThreshold,
      );
      const newPos = { ...position, x: snapped };
      setPosition(newPos);
      onChange(newPos);
    },
    [position, xRange, snapInterval, snapToZero, snapThreshold, onChange],
  );

  const handleYChange = useCallback(
    (val: number | string) => {
      if (val === "" || typeof val === "string") return;
      const snapped = applySnap(
        val,
        yRange,
        snapInterval,
        snapToZero,
        snapThreshold,
      );
      const newPos = { ...position, y: snapped };
      setPosition(newPos);
      onChange(newPos);
    },
    [position, yRange, snapInterval, snapToZero, snapThreshold, onChange],
  );

  return (
    <Stack gap="xs">
      <Box
        ref={ref}
        className={`${classes.plane}${active ? ` ${classes.planeActive}` : ""}`}
      >
        {zeroNormX >= 0 && zeroNormX <= 1 && (
          <Box
            className={classes.zeroLineV}
            style={{ left: `${zeroNormX * 100}%` }}
          />
        )}
        {zeroNormY >= 0 && zeroNormY <= 1 && (
          <Box
            className={classes.zeroLineH}
            style={{ top: `${zeroNormY * 100}%` }}
          />
        )}
        <Box
          className={`${classes.dot}${active ? ` ${classes.dotActive}` : ""}`}
          style={{
            left: `${normX * 100}%`,
            top: `${normY * 100}%`,
          }}
        />
      </Box>
      <Group gap="xs" grow>
        <NumberInput
          label="X"
          value={position.x}
          min={xRange[0]}
          max={xRange[1]}
          step={snapInterval ?? 1}
          clampBehavior="blur"
          size="xs"
          onChange={handleXChange}
        />
        <NumberInput
          label="Y"
          value={position.y}
          min={yRange[0]}
          max={yRange[1]}
          step={snapInterval ?? 1}
          clampBehavior="blur"
          size="xs"
          onChange={handleYChange}
        />
      </Group>
    </Stack>
  );
}

interface Vector2InputProps {
  values: PropertyValueInfo<Vector2 | undefined>[];
  onValueChange: (args: OnValueChangeArgs<Vector2>) => void;
  label?: string;
  description?: string;
  xRange: [number, number];
  yRange: [number, number];
  snapInterval?: number;
  snapToZero?: boolean;
  snapThreshold?: number;
  allowUndefined?: boolean;
}

export default function Vector2Input({
  values,
  onValueChange,
  label,
  description,
  xRange,
  yRange,
  snapInterval,
  snapToZero,
  snapThreshold,
  allowUndefined,
}: Vector2InputProps) {
  return (
    <PropertyValue
      label={label}
      description={description}
      noTemplate
      allowUndefined={allowUndefined}
      values={values}
      defaultValue={{ x: 0, y: 0 }}
      debounceMs={50}
      areEqual={(a, b) => a?.x === b?.x && a?.y === b?.y}
      onValueChange={onValueChange}
      renderInput={({ key, defaultValue: value, onChange }): ReactElement => (
        <Vector2PlaneWidget
          key={key}
          defaultValue={value}
          onChange={onChange}
          xRange={xRange}
          yRange={yRange}
          snapInterval={snapInterval}
          snapToZero={snapToZero}
          snapThreshold={snapThreshold}
        />
      )}
    />
  );
}
