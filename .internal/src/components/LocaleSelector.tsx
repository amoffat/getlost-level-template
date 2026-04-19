import {
  codeToFlag,
  codeToLanguage,
  SupportedLang,
  supportedLangs,
} from "@/constants/locale";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { selectors as localeSelectors } from "@/slices/locale";
import { setLocaleThunk } from "@/thunks/locale";
import { Button, Menu, ScrollArea } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconChevronDown } from "@tabler/icons-react";
import { useCallback, useMemo } from "react";

export default function LocaleSelector() {
  const dispatch = useAppDispatch();
  const currentLocale = useAppSelector(localeSelectors.currentLocale);

  const handleLocaleChange = useCallback(
    (locale: SupportedLang) => {
      dispatch(setLocaleThunk(locale));

      notifications.show({
        title: "Language changed",
        message: `The story dialogue and names are now in ${codeToLanguage[locale]}`,
      });
    },
    [dispatch],
  );

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
          {codeToFlag[currentLocale]} {codeToLanguage[currentLocale]}
        </Button>
      </Menu.Target>
      <Menu.Dropdown>
        <ScrollArea.Autosize mah={320} type="scroll">
          {supportedLocales.map((l) => (
            <Menu.Item
              key={l.value}
              onClick={() => handleLocaleChange(l.value)}
            >
              {l.flag} {l.label}
            </Menu.Item>
          ))}
        </ScrollArea.Autosize>
      </Menu.Dropdown>
    </Menu>
  );
}
