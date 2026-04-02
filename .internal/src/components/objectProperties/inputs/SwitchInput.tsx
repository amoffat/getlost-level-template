import PropertyValue, {
  PropertyValueInfo,
  PropertyValueScope,
} from "../../PropertyValue";
import { Switch } from "@mantine/core";
import { ReactElement } from "react";

interface SwitchInputProps {
  label: string;
  description: string;
  values: PropertyValueInfo<boolean>[];
  onValueChange: (
    scope: PropertyValueScope,
    value: boolean | undefined,
  ) => void;
  noTemplate?: boolean;
  debounceMs?: number;
}

export default function SwitchInput({
  label,
  description,
  values,
  onValueChange,
  noTemplate,
  debounceMs,
}: SwitchInputProps) {
  return (
    <PropertyValue
      label={label}
      description={description}
      values={values}
      defaultValue={false}
      noTemplate={noTemplate}
      debounceMs={debounceMs}
      onValueChange={onValueChange}
      renderInput={(
        key: string,
        value: boolean | undefined,
        onChange: (value: boolean) => void,
      ): ReactElement => {
        return (
          <Switch
            key={key}
            defaultChecked={value ?? false}
            onChange={(e) => onChange(e.currentTarget.checked)}
          />
        );
      }}
    />
  );
}
