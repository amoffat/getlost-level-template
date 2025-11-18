import { overlayProps } from "@/constants";
import {
  Box,
  Group,
  LoadingOverlay,
  SegmentedControl,
  Stack,
  Text,
} from "@mantine/core";
import { useDebouncedCallback } from "@mantine/hooks";
import {
  IconAlertTriangle,
  IconCircleFilled,
  IconCirclesFilled,
} from "@tabler/icons-react";
import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";

export type PropertyValueLevel = "template" | "instance" | "mixed";
export type SelectableLevel = Extract<
  PropertyValueLevel,
  "template" | "instance"
>;

export interface PropertyValueInfo<T> {
  /** The actual value */
  value: T;
  /** Whether this value is inherited from a template or set on the instance */
  level: SelectableLevel;
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
  onValueChange: (level: PropertyValueLevel, value: T | undefined) => void;
  /** Optional function to determine if two values are equal (defaults to ===) */
  areEqual?: (a: T, b: T) => boolean;
  /**
   * Optional debounce delay in ms for onValueChange callback.
   * When set, the component will use local state for immediate updates
   * and debounce calls to onValueChange.
   */
  debounceMs?: number;
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
  areEqual = (a, b) => a === b,
  debounceMs = 300,
}: PropertyValueProps<T>) {
  const analysis = useMemo(() => {
    if (values.length === 0) {
      return {
        hasMixedValues: false,
        hasMixedLevels: false,
        effectiveValue: null,
        uniqueValues: [],
        levels: new Set<SelectableLevel>(),
      };
    }

    const uniqueValues: T[] = [];
    const levels = new Set<SelectableLevel>();

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

  // Determine the current state for the SegmentedControl (based only on levels,
  // not values)
  const computedLevel = useMemo(() => {
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

  const [localLevel, setLocalLevel] =
    useState<PropertyValueLevel>(computedLevel);
  const [localValue, setLocalValue] = useState<T | null>(
    analysis.effectiveValue
  );

  const [hasPendingValue, setHasPendingValue] = useState(false);

  const debouncedSetValue = useDebouncedCallback((value: T) => {
    onValueChange(localLevel, value);
  }, debounceMs);

  // Sync local state when the effective value changes from outside
  useEffect(() => {
    setLocalValue(analysis.effectiveValue);
  }, [analysis.effectiveValue]);

  // When the segmented control changes, update level and trigger onValueChange
  const setLevel = useCallback(
    (strLevel: string) => {
      const level = strLevel as PropertyValueLevel;
      // Update local state immediately for responsive UI
      setLocalLevel(level);

      setHasPendingValue(level === "template");

      // This triggers an expensive operation in parent, so defer it
      requestIdleCallback(() => {
        onValueChange(
          level,
          level === "template" ? undefined : (localValue ?? undefined)
        );
        setHasPendingValue(false);
      });
    },
    [localValue, onValueChange]
  );

  // The widget for the input field, passed in from props
  const inputField = useMemo(
    () =>
      renderInput(localValue, (value) => {
        setLocalValue(value);

        if (analysis.hasMixedValues) {
          setLocalLevel("instance");
        }

        // Often the input can have rapid changes, like text inputs, so debounce
        // them
        debouncedSetValue(value);
      }),
    [
      localValue,
      setLocalLevel,
      renderInput,
      debouncedSetValue,
      analysis.hasMixedValues,
    ]
  );

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
        value={localLevel}
        onChange={setLevel}
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
            disabled: localLevel !== "mixed",
          },
          {
            label: (
              <Group gap={4} wrap="nowrap">
                <IconCirclesFilled size={14} />
                <Text size="xs">Instance</Text>
              </Group>
            ),
            value: "instance",
          },
          {
            label: (
              <Group gap={4} wrap="nowrap">
                <IconCircleFilled size={14} />
                <Text size="xs">Template</Text>
              </Group>
            ),
            value: "template",
          },
        ]}
        color={
          localLevel === "mixed"
            ? "orange"
            : localLevel === "template"
              ? "grape"
              : "cyan"
        }
        styles={{
          root: {
            backgroundColor: "transparent",
          },
        }}
      />

      <Box pos="relative">
        <LoadingOverlay
          visible={hasPendingValue}
          zIndex={1000}
          overlayProps={overlayProps}
          loaderProps={{ type: "bars", size: "xs" }}
        />
        {inputField}
      </Box>

      {analysis.hasMixedValues && (
        <Text size="xs" c="dimmed" fs="italic">
          Editing will set the same value for all selected objects
        </Text>
      )}
    </Stack>
  );
}
