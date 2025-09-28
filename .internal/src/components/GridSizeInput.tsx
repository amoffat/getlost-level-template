import { NumberInput } from "@mantine/core";
import { useCallback } from "react";

export type GridSizeInputProps = {
  defaultValue: number;
  onChange: (size: number) => void;
};

export default function GridSizeInput({
  defaultValue,
  onChange,
}: GridSizeInputProps) {
  const handleChange = useCallback(
    (value: number | string) => {
      if (typeof value === "string") return;
      onChange(value);
    },
    [onChange]
  );

  return (
    <NumberInput
      label="Grid size"
      placeholder="Pixels"
      suffix="px"
      defaultValue={defaultValue}
      min={4}
      max={256}
      clampBehavior="strict"
      allowDecimal={false}
      stepHoldDelay={500}
      stepHoldInterval={(t) => Math.max(1000 / t ** 2, 25)}
      mt="md"
      onChange={handleChange}
    />
  );
}
