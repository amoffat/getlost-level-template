import { useTranslation } from 'react-i18next';
import { OnValueChangeArgs, PropertyValueInfo } from "../../PropertyValue";
import SwitchInput from "./SwitchInput";

interface FlipXInputProps {
  values: PropertyValueInfo<boolean>[];
  onValueChange: (args: OnValueChangeArgs<boolean>) => void;
}

export default function FlipXInput({ values, onValueChange }: FlipXInputProps) {
  const { t } = useTranslation();
  return (
    <SwitchInput
      label={t('flipXInputLabel')}
      description={t('flipXInputDescription')}
      values={values}
      onValueChange={onValueChange}
    />
  );
}
