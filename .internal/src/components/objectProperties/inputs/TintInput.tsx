import { useTranslation } from 'react-i18next';
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
  description: descriptionProp,
}: TintInputProps) {
  const { t } = useTranslation();
  const description = descriptionProp ?? t('tintInputDescription');
  return (
    <PropertyValue
      label={t('tintInputLabel')}
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
