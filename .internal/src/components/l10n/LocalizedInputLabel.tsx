import { Group } from "@mantine/core";
import { IconLanguage } from "@tabler/icons-react";
import { ReactNode } from "react";
import ActionButton from "./ActionButton";

interface LocalizedInputLabelProps {
  /** The original label content passed to the input. */
  label: ReactNode;
  /** When true, shows the language context button. */
  showContextButton: boolean;
  /** Called when the language context button is clicked. */
  onContextClick: () => void;
}

/**
 * Wraps an input label with an optional trailing `IconLanguage` button that
 * opens the locale context modal. Used by `LocalizedTextInput` and
 * `LocalizedTextarea` to keep the label+button pattern DRY.
 */
export default function LocalizedInputLabel({
  label,
  showContextButton,
  onContextClick,
}: LocalizedInputLabelProps) {
  return (
    <Group gap={4} align="center" wrap="nowrap">
      {label}
      {showContextButton && (
        <ActionButton
          tooltip="Translation context"
          icon={<IconLanguage size={12} />}
          onClick={onContextClick}
        />
      )}
    </Group>
  );
}
