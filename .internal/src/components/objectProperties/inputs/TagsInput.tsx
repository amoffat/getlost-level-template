import { shallowEquals } from "@/utils/array";
import { sanitize } from "@/utils/marker";
import { TagsInput as MantineTagsInput } from "@mantine/core";
import { ReactElement, ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import PropertyValue, {
  OnValueChangeArgs,
  PropertyValueInfo,
} from "../../PropertyValue";

interface TagsInputProps {
  values: PropertyValueInfo<string[] | undefined>[];
  onValueChange: (args: OnValueChangeArgs<string[]>) => void;
  label?: string;
  max?: number;
  description?: string;
  noTemplate?: boolean;
  debounceMs?: number;
  validator?: (value: string[] | undefined) => ReactNode | undefined;
  placeholder?: string;
}

function sanitizeTags(values: string[]): string[] {
  return values.map(sanitize).filter(Boolean);
}

function SanitizedTagsInput({
  defaultValue,
  onChange,
  error,
  placeholder,
  max,
}: {
  defaultValue?: string[];
  onChange: (value: string[]) => void;
  error?: ReactNode;
  placeholder?: string;
  max?: number;
}) {
  const [value, setValue] = useState(() => sanitizeTags(defaultValue ?? []));

  return (
    <MantineTagsInput
      maxTags={max}
      value={value}
      error={error}
      onChange={(nextValue) => {
        const sanitized = sanitizeTags(nextValue);
        setValue(sanitized);
        onChange(sanitized);
      }}
      placeholder={placeholder}
      splitChars={[",", "|"]}
    />
  );
}

export default function TagsInput({
  values,
  onValueChange,
  validator,
  description,
  noTemplate,
  debounceMs = 100,
  max = 3,
  label,
  placeholder: placeholderProp,
}: TagsInputProps) {
  const { t } = useTranslation();
  const placeholder = placeholderProp ?? t("pickupPropTagsPlaceholder");

  return (
    <PropertyValue
      label={label}
      description={description}
      values={values}
      noTemplate={noTemplate}
      defaultValue={[]}
      areEqual={shallowEquals}
      onValueChange={onValueChange}
      debounceMs={debounceMs}
      renderInput={({ key, defaultValue: value, onChange }): ReactElement => (
        <SanitizedTagsInput
          key={key}
          max={max}
          defaultValue={value}
          error={validator?.(value ?? undefined)}
          placeholder={placeholder}
          onChange={onChange}
        />
      )}
    />
  );
}
