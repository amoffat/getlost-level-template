import { codeToFlag, codeToLanguage } from "@/constants/locale";
import { SupportedLang, supportedLangs } from "@/types/i18n";
import { Button, Group, Menu, ScrollArea } from "@mantine/core";
import { IconChevronDown } from "@tabler/icons-react";
import { ReactElement, useMemo } from "react";

type LocaleSelectorProps = {
  label: string;
  locale: SupportedLang;
  rightSection?: Map<SupportedLang, ReactElement>;
  onLocaleChange: (locale: SupportedLang) => void;
};

export default function LocaleSelector({
  label,
  locale,
  rightSection,
  onLocaleChange,
}: LocaleSelectorProps) {
  // `main` is the internal source bucket, never a language a user picks.
  const supportedLocales = useMemo(
    () =>
      supportedLangs.map((l) => ({
        value: l,
        flag: codeToFlag[l],
        label: codeToLanguage[l],
      })),
    [],
  );

  return (
    <Menu withinPortal position="bottom-end" shadow="md">
      <Menu.Target>
        <Button
          variant="transparent"
          size="xs"
          rightSection={<IconChevronDown size={12} />}
        >
          {codeToFlag[locale]} {label}
        </Button>
      </Menu.Target>
      <Menu.Dropdown>
        <ScrollArea.Autosize mah={320} type="scroll">
          {supportedLocales.map((l) => {
            return (
              <Menu.Item key={l.value} onClick={() => onLocaleChange(l.value)}>
                <Group justify="space-between" gap="xs" wrap="nowrap">
                  <span>
                    {l.flag} {l.label}
                  </span>
                  {rightSection?.get(l.value)}
                </Group>
              </Menu.Item>
            );
          })}
        </ScrollArea.Autosize>
      </Menu.Dropdown>
    </Menu>
  );
}
