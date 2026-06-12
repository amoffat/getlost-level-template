import { defaultLocale } from "@/constants";
import { useAppSelector } from "@/hooks/redux";
import { selectors as localeSelectors } from "@/slices/locale";
import { resolveLocaleText } from "@/utils/locale";
import { IconLanguage } from "@tabler/icons-react";
import { ReactElement, ReactNode, useRef } from "react";
import { useTranslation } from "react-i18next";
import { ActionButton, LocalizedTextInput } from "../../l10n";
import { LocalizedTextInputHandle } from "../../l10n/LocalizedTextInput";
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
  validator?: (value: string) => ReactNode | undefined;
  placeholder?: string;
  required?: boolean;
}

export default function LocalizedLineInput({
  values,
  onValueChange,
  validator,
  keyPrefix = [],
  description: descriptionProp,
  context,
  noTemplate,
  debounceMs = 100,
  label: labelProp,
  placeholder: placeholderProp,
  required,
}: LocalizedNameInputProps) {
  const { t } = useTranslation();
  const label = labelProp ?? t("localizedNameInputLabel");
  const description = descriptionProp ?? t("localizedNameInputDescription");
  const placeholder = placeholderProp ?? t("localizedNameInputPlaceholder");
  const currentLocale = useAppSelector(localeSelectors.activeLocale);
  const defaultEntries = useAppSelector(localeSelectors.selectDefaultEntries);

  const textInputRef = useRef<LocalizedTextInputHandle>(null);

  const contextModalButton =
    currentLocale === defaultLocale ? (
      <ActionButton
        tooltip={t("localeContextTitle")}
        icon={<IconLanguage size={12} />}
        onClick={() => textInputRef.current?.openCtx()}
      />
    ) : undefined;

  return (
    <PropertyValue
      actionButtons={[contextModalButton]}
      label={label}
      description={description}
      values={values}
      onValueChange={onValueChange}
      noTemplate={noTemplate}
      debounceMs={debounceMs}
      defaultValue={null}
      renderInput={({ key, defaultValue: value, onChange }): ReactElement => {
        const name = resolveLocaleText({
          key: value,
          primaryEntries: defaultEntries,
        });

        return (
          <LocalizedTextInput
            ref={textInputRef}
            key={`${key}-${currentLocale}`}
            error={validator?.(name)}
            contextButton={false}
            defaultContext={context}
            keyPrefix={keyPrefix}
            currentLocale={currentLocale}
            contentKey={value ?? undefined}
            placeholder={
              value === undefined
                ? t("localizedNameInputMixedValues")
                : placeholder
            }
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
