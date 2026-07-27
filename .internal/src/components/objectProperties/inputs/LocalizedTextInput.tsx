import { useAppSelector } from "@/hooks/redux";
import { selectors as localeSelectors } from "@/slices/locale";
import { isSourceEdit, resolveLocaleText } from "@/utils/locale";
import { IconLanguage } from "@tabler/icons-react";
import { ReactElement, ReactNode, useRef } from "react";
import { useTranslation } from "react-i18next";
import { ActionButton, LocalizedTextarea } from "../../l10n";
import { LocalizedTextareaHandle } from "../../l10n/LocalizedTextarea";
import PropertyValue, {
  OnValueChangeArgs,
  PropertyValueInfo,
} from "../../PropertyValue";

interface LocalizedTextInputProps {
  values: PropertyValueInfo<string | null>[];
  onValueChange: (args: OnValueChangeArgs<string | null>) => void;
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

export default function LocalizedTextInput({
  values,
  onValueChange,
  validator,
  description,
  noTemplate,
  context,
  debounceMs = 100,
  label,
  placeholder,
  required,
  multiline = false,
}: LocalizedTextInputProps) {
  const { t } = useTranslation();

  const defaultEntries = useAppSelector(localeSelectors.selectDefaultEntries);

  const textareaRef = useRef<LocalizedTextareaHandle>(null);

  // Translator context is authored on the source string, so the context button
  // only makes sense when this edit routes to the source (`main`) entry — i.e.
  // it's a source edit, not a translation — mirroring `upsertLocaleEntry`. With
  // a mixed selection there is no single entry to reason about, so hide it.
  const contentKey =
    values.length > 0 && values.every((v) => v.value === values[0].value)
      ? values[0].value
      : undefined;
  const showContextButton =
    contentKey !== undefined &&
    isSourceEdit(contentKey ? defaultEntries[contentKey] : undefined);

  const contextModalButton = showContextButton ? (
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
      required={required}
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
            key={key}
            error={validator?.(text)}
            contextButton={false}
            defaultContext={context}
            contentKey={value}
            withAsterisk={required}
            autosize
            minRows={1}
            maxRows={multiline ? undefined : 1}
            placeholder={
              value === undefined ? t("localizedInputMixedValues") : placeholder
            }
            onLocaleRefChange={(newRef) => {
              onChange(newRef ?? null);
            }}
          />
        );
      }}
    />
  );
}
