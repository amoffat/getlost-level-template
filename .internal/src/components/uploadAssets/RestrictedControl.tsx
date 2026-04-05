import {
  Fieldset,
  Group,
  SegmentedControl,
  Stack,
  Text,
} from "@mantine/core";
import { IconLicense, IconLock, IconLockOpen2 } from "@tabler/icons-react";

interface RestrictedControlProps {
  value: boolean;
  onChange: (value: boolean) => void;
}

/**
 * Shared shareable/restricted SegmentedControl shown for all asset upload types.
 * Asks whether the asset's license permits sharing; if not, it will be encrypted.
 */
export default function RestrictedControl({
  value,
  onChange,
}: RestrictedControlProps) {
  return (
    <Fieldset
      mt="lg"
      legend={
        <Group gap="xs">
          <IconLicense size={16} />
          License restrictions
        </Group>
      }
    >
      <Stack p={0}>
        <Text size="sm">
          Does the license for this asset allow you to share it with others? If
          you're unsure, select "No."
        </Text>
        <SegmentedControl
          fullWidth
          orientation="vertical"
          data={[
            {
              label: (
                <Group align="center" gap="xs">
                  <IconLockOpen2 />
                  Yes, it's shareable
                </Group>
              ),
              value: "false",
            },
            {
              label: (
                <Group align="center" gap="xs">
                  <IconLock />
                  No, encrypt it
                </Group>
              ),
              value: "true",
            },
          ]}
          value={String(value)}
          onChange={(v) => onChange(v === "true")}
        />
      </Stack>
    </Fieldset>
  );
}
