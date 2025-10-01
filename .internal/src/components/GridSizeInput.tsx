import { NumberInput } from "@mantine/core";

export type GridSizeInputProps = {
  defaultValue: number;
  onChange: (size: number) => void;
};

export default function GridSizeInput({
  defaultValue,
  onChange,
}: GridSizeInputProps) {
  const handleChange = (value: number | string) => {
    if (value === "") return;
    if (typeof value === "string") return;
    onChange(value);
  };

  return (
    <NumberInput
      label="Grid size"
      placeholder="Pixels"
      defaultValue={defaultValue}
      min={4}
      max={256}
      clampBehavior="blur"
      allowDecimal={false}
      stepHoldDelay={500}
      stepHoldInterval={(t) => Math.max(1000 / t ** 2, 25)}
      onChange={handleChange}
    />
  );
}
