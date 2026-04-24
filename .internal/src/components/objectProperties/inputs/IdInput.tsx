import { useTranslation } from 'react-i18next';
import { ActionIcon, Box, Group, TextInput, Tooltip } from "@mantine/core";
import { IconCopy } from "@tabler/icons-react";

interface IdInputProps {
  id: string;
}

export default function IdInput({ id }: IdInputProps) {
  const { t } = useTranslation();
  const copyId = () => {
    navigator.clipboard.writeText(id);
  };

  return (
    <Group gap="xs" wrap="nowrap">
      <Box style={{ flex: 1 }}>
        <TextInput
          label={t('idInputLabel')}
          description={t('idInputDescription')}
          value={id}
          disabled
        />
      </Box>
      <Tooltip label={t('idInputCopyTooltip')}>
        <ActionIcon onClick={copyId} variant="subtle" color="gray" size="sm">
          <IconCopy size={16} />
        </ActionIcon>
      </Tooltip>
    </Group>
  );
}
