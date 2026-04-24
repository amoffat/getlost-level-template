import { Button, Collapse } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { ReactNode } from "react";
import { useTranslation } from "react-i18next";

interface AdvancedSectionProps {
  /** Content to be displayed inside the collapsible section */
  children: ReactNode;
  /** Optional label for the button. Defaults to "Advanced" */
  label?: string;
  /** Optional initial open state. Defaults to false */
  defaultOpen?: boolean;
}

export default function AdvancedSection({
  children,
  label,
  defaultOpen = false,
}: AdvancedSectionProps) {
  const { t } = useTranslation();
  const resolvedLabel = label ?? t("advancedLabel");
  const [opened, { toggle }] = useDisclosure(defaultOpen);

  return (
    <>
      <Button variant="subtle" size="xs" onClick={toggle} fullWidth>
        {opened ? t("advancedHide") : t("advancedShow")} {resolvedLabel}
      </Button>

      <Collapse expanded={opened}>{children}</Collapse>
    </>
  );
}
