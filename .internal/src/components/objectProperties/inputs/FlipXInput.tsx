import { OnValueChangeArgs, PropertyValueInfo } from "../../PropertyValue";
import SwitchInput from "./SwitchInput";

interface FlipXInputProps {
  values: PropertyValueInfo<boolean>[];
  onValueChange: (args: OnValueChangeArgs<boolean>) => void;
}

export default function FlipXInput({ values, onValueChange }: FlipXInputProps) {
  return (
    <SwitchInput
      label="Flip X"
      description="Whether to flip the object horizontally."
      values={values}
      onValueChange={onValueChange}
    />
  );
}
