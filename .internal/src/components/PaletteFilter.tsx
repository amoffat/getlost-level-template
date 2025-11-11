import { ActionIcon, Menu, Switch } from "@mantine/core";
import { IconFilter } from "@tabler/icons-react";
import { memo, useCallback, useState, useTransition } from "react";

export interface FilterToggle {
  key: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

interface PaletteFilterProps {
  toggles: FilterToggle[];
}

// Memoized switch that maintains its own state for instant feedback
const ResponsiveSwitch = memo(
  ({ toggle }: { toggle: FilterToggle }) => {
    const [isChecked, setIsChecked] = useState(toggle.checked);
    const [, startTransition] = useTransition();

    const handleChange = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const newChecked = event.currentTarget.checked;
        // Update local state immediately for instant visual feedback
        setIsChecked(newChecked);
        // Wrap Redux action in transition - marks it as low-priority
        // This prevents the expensive palette filtering from blocking other UI updates
        startTransition(() => {
          toggle.onChange(newChecked);
        });
      },
      [toggle]
    );

    return (
      <Switch
        size="xs"
        label={toggle.label}
        checked={isChecked}
        onChange={handleChange}
      />
    );
  },
  (prev, next) => {
    // Only re-render if the toggle key changes, ignore checked changes from Redux
    return (
      prev.toggle.key === next.toggle.key &&
      prev.toggle.label === next.toggle.label
    );
  }
);

export default function PaletteFilter({ toggles }: PaletteFilterProps) {
  const hasAFilter = toggles.some((t) => t.checked);

  return (
    <Menu shadow="md" width="lg" position="top" withArrow>
      <Menu.Target>
        <ActionIcon
          size="input-sm"
          variant={hasAFilter ? "filled" : "default"}
          aria-label="Filter options"
        >
          <IconFilter size={16} />
        </ActionIcon>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>Filter Options</Menu.Label>
        {toggles.map((toggle) => (
          <Menu.Item key={toggle.key} closeMenuOnClick={false}>
            <ResponsiveSwitch toggle={toggle} />
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}
