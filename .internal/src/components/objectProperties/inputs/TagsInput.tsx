import { shallowEquals } from "@/utils/array";
import { sanitize as defaultSanitize } from "@/utils/marker";
import { TagsInput as MantineTagsInput } from "@mantine/core";
import { ReactElement, ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import PropertyValue, {
  OnValueChangeArgs,
  PropertyValueInfo,
} from "../../PropertyValue";

const DEFAULT_SPLIT_CHARS = [",", "|"];

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
  splitChars?: string[];
  sanitize?: (value: string) => string;
}

function sanitizeTags(
  values: string[],
  sanitizeFn: (v: string) => string,
): string[] {
  return values.map(sanitizeFn).filter(Boolean);
}

function SanitizedTagsInput({
  defaultValue,
  onChange,
  error,
  placeholder,
  max,
  splitChars = DEFAULT_SPLIT_CHARS,
  sanitize: sanitizeFn = defaultSanitize,
}: {
  defaultValue?: string[];
  onChange: (value: string[]) => void;
  error?: ReactNode;
  placeholder?: string;
  max?: number;
  splitChars?: string[];
  sanitize?: (value: string) => string;
}) {
  const [value, setValue] = useState(() =>
    sanitizeTags(defaultValue ?? [], sanitizeFn),
  );
  const [searchValue, setSearchValue] = useState("");

  return (
    <MantineTagsInput
      maxTags={max}
      value={value}
      error={error}
      onChange={(nextValue) => {
        const sanitized = sanitizeTags(nextValue, sanitizeFn);
        setValue(sanitized);
        setSearchValue("");
        onChange(sanitized);
      }}
      searchValue={searchValue}
      onSearchChange={(val) => {
        const sanitized = sanitizeFn(val);
        // Preserve a trailing dash when the last typed char is non-alphanumeric,
        // so the user can type "hello-world" without the dash being stripped mid-entry.
        const lastCharIsAlpha =
          val.length === 0 || /[a-z0-9=]/i.test(val.slice(-1));
        const display =
          !lastCharIsAlpha && sanitized && !sanitized.endsWith("-")
            ? sanitized + "-"
            : sanitized;
        setSearchValue(display);
      }}
      placeholder={placeholder}
      splitChars={splitChars}
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
  splitChars,
  sanitize,
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
          splitChars={splitChars}
          sanitize={sanitize}
        />
      )}
    />
  );
}
