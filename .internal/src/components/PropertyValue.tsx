import { Group, SegmentedControl, Stack, Text } from "@mantine/core";
import {
  IconAlertTriangle,
  IconHierarchy,
  IconUser,
} from "@tabler/icons-react";
import { ReactNode, useMemo } from "react";

export type PropertyValueLevel = "template" | "instance" | "mixed";

export interface PropertyValueInfo<T> {
  /** The actual value */
  value: T;
  /** Whether this value is inherited from a template or set on the instance */
  level: "template" | "instance";
}

export interface PropertyValueProps<T> {
  /** Label for the property */
  label?: string;
  /** Description text shown below the label */
  description?: string;
  /** Array of value info from all selected objects */
  values: PropertyValueInfo<T>[];
  /** The input component to render. Receives the effective value and onChange callback */
  renderInput: (value: T | null, onChange: (value: T) => void) => ReactNode;
  /** Callback when the user changes the value */
  onValueChange: (value: T) => void;
  /** Callback when the user changes the level (template/instance/mixed) */
  onLevelChange: (level: PropertyValueLevel) => void;
  /** Optional function to determine if two values are equal (defaults to ===) */
  areEqual?: (a: T, b: T) => boolean;
}

/**
 * A component for editing a property value across multiple selected objects.
 * Handles cases where:
 * - Objects have different values (shows "Mixed values" indicator)
 * - Values are inherited from templates vs set on instances (shows level indicators)
 * - All objects share the same value (normal editing)
 */
export default function PropertyValue<T>({
  label,
  description,
  values,
  renderInput,
  onValueChange,
  onLevelChange,
  areEqual = (a, b) => a === b,
}: PropertyValueProps<T>) {
  const analysis = useMemo(() => {
    if (values.length === 0) {
      return {
        hasMixedValues: false,
        hasMixedLevels: false,
        effectiveValue: null,
        uniqueValues: [],
        levels: new Set<"template" | "instance">(),
      };
    }

    const uniqueValues: T[] = [];
    const levels = new Set<"template" | "instance">();

    // Collect unique values and levels
    for (const info of values) {
      levels.add(info.level);

      // Check if this value is already in our unique list
      const exists = uniqueValues.some((v) => areEqual(v, info.value));
      if (!exists) {
        uniqueValues.push(info.value);
      }
    }

    const hasMixedValues = uniqueValues.length > 1;
    const hasMixedLevels = levels.size > 1;

    // For the effective value:
    // - If all values are the same, use that value
    // - If values differ, use null (which can be interpreted as "mixed")
    const effectiveValue = hasMixedValues ? null : values[0].value;

    return {
      hasMixedValues,
      hasMixedLevels,
      effectiveValue,
      uniqueValues,
      levels,
    };
  }, [values, areEqual]);

  // Determine the current state for the SegmentedControl (based only on levels, not values)
  const segmentValue = useMemo(() => {
    if (analysis.hasMixedLevels) {
      return "mixed";
    }
    if (analysis.levels.has("template")) {
      return "template";
    }
    if (analysis.levels.has("instance")) {
      return "instance";
    }
    return "instance"; // default fallback
  }, [analysis]);

  return (
    <Stack gap="xs" p={0}>
      {label && (
        <div>
          <Text size="sm" fw={500}>
            {label}
          </Text>
          {description && (
            <Text size="xs" c="dimmed">
              {description}
            </Text>
          )}
        </div>
      )}

      <SegmentedControl
        p={0}
        value={segmentValue}
        onChange={(value) => {
          if (onLevelChange) {
            onLevelChange(value as PropertyValueLevel);
          }
        }}
        size="xs"
        data={[
          {
            label: (
              <Group gap={4} wrap="nowrap">
                <IconAlertTriangle size={14} />
                <Text size="xs">Mixed</Text>
              </Group>
            ),
            value: "mixed",
            disabled: segmentValue !== "mixed",
          },
          {
            label: (
              <Group gap={4} wrap="nowrap">
                <IconUser size={14} />
                <Text size="xs">Instance</Text>
              </Group>
            ),
            value: "instance",
          },
          {
            label: (
              <Group gap={4} wrap="nowrap">
                <IconHierarchy size={14} />
                <Text size="xs">Template</Text>
              </Group>
            ),
            value: "template",
          },
        ]}
        color={
          segmentValue === "mixed"
            ? "orange"
            : segmentValue === "template"
              ? "grape"
              : "cyan"
        }
        styles={{
          root: {
            backgroundColor: "transparent",
          },
        }}
      />

      {renderInput(analysis.effectiveValue, onValueChange)}

      {analysis.hasMixedValues && (
        <Text size="xs" c="dimmed" fs="italic">
          Editing will set the same value for all selected objects
        </Text>
      )}
    </Stack>
  );
}
