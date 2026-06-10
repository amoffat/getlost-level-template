import PropertyValue, { PropertyValueInfo } from "@/components/PropertyValue";
import { TextInput } from "@mantine/core";
import { ReactElement } from "react";
import { useTranslation } from "react-i18next";

interface IdInputProps {
  values: PropertyValueInfo<string>[];
}

export default function IdInput({ values }: IdInputProps) {
  const { t } = useTranslation();

  return (
    <PropertyValue
      label={t("idInputLabel")}
      description={t("idInputDescription")}
      noTemplate
      noReset
      allowCopy
      values={values}
      renderInput={({ key, defaultValue: value }): ReactElement => (
        <TextInput key={key} defaultValue={value} disabled />
      )}
    />
  );
}
