import { defaultLocale } from "@/constants";
import { Group } from "@mantine/core";
import { IconLanguage } from "@tabler/icons-react";
import { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import ActionButton from "./ActionButton";

interface LocalizedInputLabelProps {
  locale: string;
  /** The original label content passed to the input. */
  label: ReactNode;
  /** Called when the language context button is clicked. */
  onContextClick: () => void;
}

/**
 * Wraps an input label with an optional trailing `IconLanguage` button that
 * opens the locale context modal. Used by `LocalizedTextInput` and
 * `LocalizedTextarea` to keep the label+button pattern DRY.
 */
export default function LocalizedInputLabel({
  locale,
  label,
  onContextClick,
}: LocalizedInputLabelProps) {
  const { t } = useTranslation();

  return (
    <Group gap={4} align="center" wrap="nowrap">
      {label}
      {locale === defaultLocale && (
        <ActionButton
          tooltip={t("localeContextTitle")}
          icon={<IconLanguage size={12} />}
          onClick={onContextClick}
        />
      )}
    </Group>
  );
}
