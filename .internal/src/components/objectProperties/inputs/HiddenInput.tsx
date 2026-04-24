import { useTranslation } from 'react-i18next';
import { OnValueChangeArgs, PropertyValueInfo } from "../../PropertyValue";
import SwitchInput from "./SwitchInput";

interface HiddenInputProps {
  values: PropertyValueInfo<boolean>[];
  onValueChange: (args: OnValueChangeArgs<boolean>) => void;
  description?: string;
  noTemplate?: boolean;
  debounceMs?: number;
}

export default function HiddenInput({
  values,
  onValueChange,
  description: descriptionProp,
  noTemplate,
  debounceMs,
}: HiddenInputProps) {
  const { t } = useTranslation();
  const description = descriptionProp ?? t('hiddenInputDescription');
  return (
    <SwitchInput
      label={t('hiddenInputLabel')}
      description={description}
      values={values}
      onValueChange={onValueChange}
      noTemplate={noTemplate}
      debounceMs={debounceMs}
    />
  );
}
