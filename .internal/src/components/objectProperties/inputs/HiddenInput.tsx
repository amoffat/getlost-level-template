import { PropertyValueInfo, PropertyValueScope } from "../../PropertyValue";
import SwitchInput from "./SwitchInput";

interface HiddenInputProps {
  values: PropertyValueInfo<boolean>[];
  onValueChange: (
    scope: PropertyValueScope,
    value: boolean | undefined,
  ) => void;
  description?: string;
  noTemplate?: boolean;
  debounceMs?: number;
}

export default function HiddenInput({
  values,
  onValueChange,
  description = "Whether this object starts off hidden on the map.",
  noTemplate,
  debounceMs,
}: HiddenInputProps) {
  return (
    <SwitchInput
      label="Hidden"
      description={description}
      values={values}
      onValueChange={onValueChange}
      noTemplate={noTemplate}
      debounceMs={debounceMs}
    />
  );
}
