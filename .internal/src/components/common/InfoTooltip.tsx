import { ActionIcon, Box, Group, Modal } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconInfoCircle } from "@tabler/icons-react";
import { ReactNode } from "react";

interface InfoTooltipProps {
  /** Content to be displayed inside the modal */
  children: ReactNode;
  /** Optional title for the modal */
  title?: string;
}

export default function InfoTooltip({
  children,
  title = "Info",
}: InfoTooltipProps) {
  const [opened, { open, close }] = useDisclosure(false);

  return (
    <>
      <ActionIcon variant="subtle" size="xs" onClick={open} ml={3}>
        <IconInfoCircle size={14} />
      </ActionIcon>

      <Modal
        opened={opened}
        onClose={close}
        title={
          <Group gap="xs">
            <IconInfoCircle size={20} /> {title}
          </Group>
        }
        centered
        size="lg"
      >
        <Box p="md">{children}</Box>
      </Modal>
    </>
  );
}
