import PropertyValue, {
  PropertyValueInfo,
  PropertyValueScope,
} from "../../PropertyValue";
import { ColorInput } from "@mantine/core";
import { ReactElement } from "react";

interface TintInputProps {
  values: PropertyValueInfo<string | null>[];
  onValueChange: (
    scope: PropertyValueScope,
    value: string | null | undefined,
  ) => void;
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
      renderInput={(
        key: string,
        value: string | null | undefined,
        onChange: (value: string) => void,
      ): ReactElement => {
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
