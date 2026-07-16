import { sanitize } from "@/utils/slug";
import { TextInput } from "@mantine/core";
import { ReactElement, ReactNode, useRef } from "react";
import { useTranslation } from "react-i18next";
import PropertyValue, {
  OnValueChangeArgs,
  PropertyValueInfo,
} from "../../PropertyValue";

interface SlugInputProps {
  values: PropertyValueInfo<string | null>[];
  onValueChange: (args: OnValueChangeArgs<string | null>) => void;
  label?: string;
  description?: string;
  noTemplate?: boolean;
  debounceMs?: number;
  validator?: (value: string | undefined) => ReactNode | undefined;
  placeholder?: string;
  required?: boolean;
  allowCopy?: boolean;
}

/**
 * An uncontrolled TextInput that sanitizes user input into slug format on
 * every change, updating the DOM value in place so the user sees the
 * sanitized result immediately.
 */
function SlugTextInput({
  defaultValue,
  onChange,
  error,
  ...props
}: {
  defaultValue?: string | null;
  onChange: (value: string) => void;
  error?: ReactNode;
  placeholder?: string;
  required?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);

  return (
    <TextInput
      ref={ref}
      defaultValue={defaultValue ?? undefined}
      error={error}
      onChange={(e) => {
        const sanitized = sanitize(e.target.value);
        if (ref.current) {
          ref.current.value = sanitized;
        }
        onChange(sanitized);
      }}
      {...props}
    />
  );
}

export default function SlugInput({
  values,
  onValueChange,
  validator,
  description: descriptionProp,
  noTemplate,
  allowCopy = true,
  debounceMs = 100,
  label: labelProp,
  placeholder: placeholderProp,
  required,
}: SlugInputProps) {
  const { t } = useTranslation();
  const label = labelProp ?? t("localizedNameInputLabel");
  const description = descriptionProp ?? t("localizedNameInputDescription");
  const placeholder = placeholderProp ?? t("localizedNameInputPlaceholder");

  return (
    <PropertyValue
      label={label}
      allowCopy={allowCopy}
      description={description}
      values={values}
      onValueChange={onValueChange}
      noTemplate={noTemplate}
      debounceMs={debounceMs}
      defaultValue={null}
      renderInput={({ key, defaultValue: value, onChange }): ReactElement => (
        <SlugTextInput
          key={key}
          defaultValue={value}
          error={validator?.(value ?? undefined)}
          placeholder={
            value === undefined
              ? t("localizedNameInputMixedValues")
              : placeholder
          }
          required={required}
          onChange={(sanitized) => {
            onChange(sanitized || null);
          }}
        />
      )}
    />
  );
}
