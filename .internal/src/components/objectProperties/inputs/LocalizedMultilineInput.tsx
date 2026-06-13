import { defaultLocale } from "@/constants";
import { useAppSelector } from "@/hooks/redux";
import { selectors as localeSelectors } from "@/slices/locale";
import { resolveLocaleText } from "@/utils/locale";
import { IconLanguage } from "@tabler/icons-react";
import { ReactElement, ReactNode, useRef } from "react";
import { useTranslation } from "react-i18next";
import { ActionButton, LocalizedTextarea } from "../../l10n";
import { LocalizedTextareaHandle } from "../../l10n/LocalizedTextarea";
import PropertyValue, {
  OnValueChangeArgs,
  PropertyValueInfo,
} from "../../PropertyValue";

interface LocalizedMultilineInputProps {
  values: PropertyValueInfo<string | null>[];
  onValueChange: (args: OnValueChangeArgs<string | null>) => void;
  keyPrefix?: string[];
  label: string;
  description?: string;
  noTemplate?: boolean;
  context: string;
  contextButton?: boolean;
  debounceMs?: number;
  validator?: (value: string) => ReactNode | undefined;
  placeholder?: string;
  required?: boolean;
  multiline?: boolean;
}

export default function LocalizedMultilineInput({
  values,
  onValueChange,
  validator,
  keyPrefix = [],
  description,
  noTemplate,
  context,
  debounceMs = 100,
  label,
  placeholder,
  required,
  multiline = false,
}: LocalizedMultilineInputProps) {
  const { t } = useTranslation();

  const currentLocale = useAppSelector(localeSelectors.activeLocale);
  const defaultEntries = useAppSelector(localeSelectors.selectDefaultEntries);

  const textareaRef = useRef<LocalizedTextareaHandle>(null);

  const contextModalButton =
    currentLocale === defaultLocale ? (
      <ActionButton
        key="locale-context"
        tooltip={t("localeContextTitle")}
        icon={<IconLanguage size={12} />}
        onClick={() => textareaRef.current?.openCtx()}
      />
    ) : undefined;

  return (
    <PropertyValue
      label={label}
      description={description}
      values={values}
      onValueChange={onValueChange}
      noTemplate={noTemplate}
      debounceMs={debounceMs}
      defaultValue={null}
      actionButtons={[contextModalButton]}
      renderInput={({ key, defaultValue: value, onChange }): ReactElement => {
        const text = resolveLocaleText({
          key: value,
          primaryEntries: defaultEntries,
        });

        return (
          <LocalizedTextarea
            ref={textareaRef}
            key={`${key}-${currentLocale}`}
            error={validator?.(text)}
            contextButton={false}
            keyPrefix={keyPrefix}
            defaultContext={context}
            currentLocale={currentLocale}
            contentKey={value}
            withAsterisk={required}
            autosize
            minRows={1}
            maxRows={multiline ? undefined : 1}
            placeholder={
              value === undefined ? t("localizedInputMixedValues") : placeholder
            }
            onLocaleKeyChange={(newKey) => {
              onChange(newKey ?? null);
            }}
          />
        );
      }}
    />
  );
}
