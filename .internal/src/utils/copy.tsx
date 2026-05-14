import { notifications } from "@mantine/notifications";
import { IconCopy } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function copyToClipboard({
  value,
  t,
}: {
  value: string;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  navigator.clipboard.writeText(value);
  notifications.show({
    message: t("copiedToClipboard"),
    color: "green",
    icon: <IconCopy size={14} />,
    autoClose: 1000,
  });
}
