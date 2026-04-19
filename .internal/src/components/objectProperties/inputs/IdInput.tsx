import { ActionIcon, Box, Group, TextInput, Tooltip } from "@mantine/core";
import { IconCopy } from "@tabler/icons-react";

interface IdInputProps {
  id: string;
}

export default function IdInput({ id }: IdInputProps) {
  const copyId = () => {
    navigator.clipboard.writeText(id);
  };

  return (
    <Group gap="xs" wrap="nowrap">
      <Box style={{ flex: 1 }}>
        <TextInput
          label="ID"
          description="The object's unique identifier."
          value={id}
          disabled
        />
      </Box>
      <Tooltip label="Copy id">
        <ActionIcon onClick={copyId} variant="subtle" color="gray" size="sm">
          <IconCopy size={16} />
        </ActionIcon>
      </Tooltip>
    </Group>
  );
}
