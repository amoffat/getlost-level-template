import { Button, Collapse } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { ReactNode } from "react";

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
  label = "Advanced",
  defaultOpen = false,
}: AdvancedSectionProps) {
  const [opened, { toggle }] = useDisclosure(defaultOpen);

  return (
    <>
      <Button variant="subtle" size="xs" onClick={toggle} fullWidth>
        {opened ? "Hide" : "Show"} {label}
      </Button>

      <Collapse in={opened}>{children}</Collapse>
    </>
  );
}
