import { useAppSelector } from "@/hooks/redux";
import { selectors as localeSelectors } from "@/slices/locale";
import { resolveLocaleText } from "@/utils/locale";
import { ReactElement, ReactNode } from "react";
import { LocalizedTextInput } from "../../l10n";
import PropertyValue, {
  OnValueChangeArgs,
  PropertyValueInfo,
} from "../../PropertyValue";

interface LocalizedNameInputProps {
  values: PropertyValueInfo<string | null>[];
  onValueChange: (args: OnValueChangeArgs<string | null>) => void;
  context: string;
  keyPrefix?: string[];
  label?: string;
  description?: string;
  noTemplate?: boolean;
  debounceMs?: number;
  validator?: (value: string | undefined) => ReactNode | undefined;
  placeholder?: string;
  required?: boolean;
}

export default function LocalizedNameInput({
  values,
  onValueChange,
  validator,
  keyPrefix = [],
  description = "A name for this object.",
  context,
  noTemplate,
  debounceMs = 100,
  label = "Name",
  placeholder = "Enter name",
  required,
}: LocalizedNameInputProps) {
  const currentLocale = useAppSelector(localeSelectors.activeLocale);
  const defaultEntries = useAppSelector(localeSelectors.selectDefaultEntries);

  return (
    <PropertyValue
      label={label}
      description={description}
      values={values}
      onValueChange={onValueChange}
      noTemplate={noTemplate}
      debounceMs={debounceMs}
      defaultValue=""
      renderInput={({ key, defaultValue: value, onChange }): ReactElement => {
        const name = resolveLocaleText({
          key: value,
          primaryEntries: defaultEntries,
        });

        return (
          <LocalizedTextInput
            key={`${key}-${currentLocale}`}
            error={validator?.(name)}
            contextButton={false}
            defaultContext={context}
            keyPrefix={keyPrefix}
            currentLocale={currentLocale}
            contentKey={value ?? undefined}
            placeholder={value === undefined ? "Mixed values" : placeholder}
            required={required}
            onLocaleKeyChange={(newKey) => {
              onChange(newKey ?? null);
            }}
          />
        );
      }}
    />
  );
}
