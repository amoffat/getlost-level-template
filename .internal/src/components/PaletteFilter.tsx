import { ActionIcon, Menu, Switch } from "@mantine/core";
import { IconFilter } from "@tabler/icons-react";

export interface FilterToggle {
  key: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

interface PaletteFilterProps {
  toggles: FilterToggle[];
}

export default function PaletteFilter({ toggles }: PaletteFilterProps) {
  return (
    <Menu shadow="md" width="lg">
      <Menu.Target>
        <ActionIcon
          size="input-sm"
          variant="default"
          aria-label="Filter options"
        >
          <IconFilter size={16} />
        </ActionIcon>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>Filter Options</Menu.Label>
        {toggles.map((toggle) => (
          <Menu.Item key={toggle.key} closeMenuOnClick={false}>
            <Switch
              size="xs"
              label={toggle.label}
              checked={toggle.checked}
              onChange={(event) => toggle.onChange(event.currentTarget.checked)}
            />
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}
