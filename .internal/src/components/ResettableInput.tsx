import { ActionIcon, Box, Group, Tooltip } from "@mantine/core";
import { IconRestore } from "@tabler/icons-react";
import { ReactNode } from "react";

interface ResettableInputProps {
  children: ReactNode;
  disabled?: boolean;
  onReset: () => void;
}

export default function ResettableInput({
  children,
  disabled,
  onReset,
}: ResettableInputProps) {
  return (
    <Group gap="xs" wrap="nowrap">
      <Box style={{ flex: 1 }}>{children}</Box>
      <Tooltip label="Reset to default">
        <ActionIcon
          onClick={onReset}
          disabled={disabled}
          variant="subtle"
          color="gray"
          size="sm"
        >
          <IconRestore size={16} />
        </ActionIcon>
      </Tooltip>
    </Group>
  );
}
