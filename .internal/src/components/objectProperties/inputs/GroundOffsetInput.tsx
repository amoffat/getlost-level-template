import PropertyValue, {
  OnValueChangeArgs,
  PropertyValueInfo,
} from "../../PropertyValue";
import { Slider } from "@mantine/core";
import { ReactElement, ReactNode } from "react";

interface GroundOffsetInputProps {
  values: PropertyValueInfo<number>[];
  onValueChange: (args: OnValueChangeArgs<number>) => void;
  description?: string;
  tooltip?: ReactNode;
  min?: number;
}

export default function GroundOffsetInput({
  values,
  onValueChange,
  description = "Vertical offset of the object from the ground.",
  tooltip,
  min = -16,
}: GroundOffsetInputProps) {
  return (
    <PropertyValue
      label="Ground offset"
      description={description}
      tooltip={tooltip}
      values={values}
      defaultValue={0}
      debounceMs={100}
      onValueChange={onValueChange}
      renderInput={(
        key: string,
        value: number | undefined,
        onChange: (value: number) => void,
      ): ReactElement => {
        return (
          <Slider
            key={key}
            defaultValue={value ?? 0}
            onChange={onChange}
            min={min}
            max={16}
            step={1}
          />
        );
      }}
    />
  );
}
