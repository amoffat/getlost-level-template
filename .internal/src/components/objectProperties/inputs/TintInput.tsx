import PropertyValue, {
  OnValueChangeArgs,
  PropertyValueInfo,
} from "../../PropertyValue";
import { ColorInput } from "@mantine/core";
import { ReactElement } from "react";

interface TintInputProps {
  values: PropertyValueInfo<string | null>[];
  onValueChange: (args: OnValueChangeArgs<string | null>) => void;
  description?: string;
}

export default function TintInput({
  values,
  onValueChange,
  description = "A color tint to apply to this object.",
}: TintInputProps) {
  return (
    <PropertyValue
      label="Tint"
      description={description}
      values={values}
      onValueChange={onValueChange}
      defaultValue={null}
      debounceMs={100}
      renderInput={({
        key,
        defaultValue: value,
        onChange,
      }): ReactElement => {
        const hexColor = value ? `#${value}` : "";

        return (
          <ColorInput
            key={key}
            format="hex"
            defaultValue={hexColor}
            onChange={(hex) => {
              onChange(hex.replace("#", ""));
            }}
          />
        );
      }}
    />
  );
}
