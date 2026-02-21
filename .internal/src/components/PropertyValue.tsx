import { overlayProps } from "@/constants";
import {
  Alert,
  Box,
  Group,
  Input,
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
import { x64 } from "murmurhash3js";
import {
  ReactElement,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ErrorBoundary } from "react-error-boundary";
import InfoTooltip from "./common/InfoTooltip";
import ResettableInput from "./ResettableInput";

export type PropertyValueScope = "template" | "instance" | "mixed";
export type SelectableScope = Extract<
  PropertyValueScope,
  "template" | "instance"
>;

export interface PropertyValueInfo<T> {
  // Used purely for key generation/stability for react components
  key: string;
  /** The actual value */
  value: T;
  /** Whether this value is inherited from a template or set on the instance */
  scope: SelectableScope;
}

interface PropertyValueProps<T> {
  /** Label for the property */
  label?: string;
  /** Description text shown below the label */
  description?: string;
  /** Array of value info from all selected objects */
  values: PropertyValueInfo<T>[];
  /** The input component to render. Receives the effective value and onChange callback */
  renderInput: (
    key: string,
    defaultValue: T | undefined,
    onChange: (value: T) => void,
  ) => ReactElement;
  /** Callback when the user changes the value */
  onValueChange: (scope: PropertyValueScope, value: T | undefined) => void;
  /** Optional function to determine if two values are equal (defaults to ===) */
  areEqual?: (a: T, b: T) => boolean;
  /**
   * Optional debounce delay in ms for onValueChange callback.
   * When set, the component will use local state for immediate updates
   * and debounce calls to onValueChange.
   */
  debounceMs?: number;
  /** If true, hides the SegmentedControl and only allows per-instance changes */
  noTemplate?: boolean;
  /** Optional default value to reset to when the reset button is clicked */
  defaultValue?: T;
  tooltip?: ReactNode;
}

/**
 * A component for editing a property value across multiple selected objects.
 * Handles cases where:
 * - Objects have different values (shows "Mixed values" indicator)
 * - Values are inherited from templates vs set on instances (shows level indicators)
 * - All objects share the same value (normal editing)
 *
 * Note: This component automatically generates a stable key based on the values prop
 * and label to ensure proper remounting when the selection changes.
 */
function PropertyValueInner<T>({
  label,
  description,
  values,
  renderInput,
  onValueChange,
  areEqual = (a, b) => a === b,
  debounceMs,
  noTemplate = false,
  defaultValue,
  tooltip,
  refreshKey,
}: PropertyValueProps<T> & { refreshKey: string }) {
  const [resetCounter, setResetCounter] = useState(0);

  // Because the component returned from renderInput is an uncontrolled
  // component, we need a way to reset it. This key does that.
  const inputKey = useMemo(() => {
    return `${refreshKey}/${resetCounter}`;
  }, [resetCounter, refreshKey]);

  const analysis = useMemo(() => {
    if (values.length === 0) {
      return {
        hasMixedValues: false,
        hasMixedScopes: false,
        effectiveValue: undefined,
        uniqueValues: [],
        scopes: new Set<SelectableScope>(),
      };
    }

    const uniqueValues: T[] = [];
    const scopes = new Set<SelectableScope>();

    // Collect unique values and scopes
    for (const info of values) {
      scopes.add(info.scope);

      // Check if this value is already in our unique list
      const exists = uniqueValues.some((v) => areEqual(v, info.value));
      if (!exists) {
        uniqueValues.push(info.value);
      }
    }

    const hasMixedValues = uniqueValues.length > 1;
    const hasMixedScopes = scopes.size > 1;

    // For the effective value:
    // - If all values are the same, use that value
    // - If values differ, use null (which can be interpreted as "mixed")
    const effectiveValue = hasMixedValues ? undefined : values[0].value;

    return {
      hasMixedValues,
      hasMixedScopes,
      effectiveValue,
      uniqueValues,
      scopes: scopes,
    };
  }, [values, areEqual]);

  // Determine the current state for the SegmentedControl (based only on scopes,
  // not values)
  const computedScope = useMemo(() => {
    if (analysis.hasMixedScopes) {
      return "mixed";
    }
    if (analysis.scopes.has("template")) {
      return "template";
    }
    if (analysis.scopes.has("instance")) {
      return "instance";
    }
    return "instance"; // default fallback
  }, [analysis]);

  const [localScope, setLocalScope] =
    useState<PropertyValueScope>(computedScope);
  const [localValue, setLocalValue] = useState<T | undefined>(
    analysis.effectiveValue,
  );

  const [hasPendingValue, setHasPendingValue] = useState(false);

  const setValue = useCallback(
    (value: T) => {
      onValueChange(noTemplate ? "instance" : localScope, value);
    },
    [localScope, noTemplate, onValueChange],
  );

  const debouncedSetValue = useDebouncedCallback((value: T) => {
    setValue(value);
  }, debounceMs ?? 0);

  // Sync local state when the effective value changes from outside
  useEffect(() => {
    setLocalValue(analysis.effectiveValue);
  }, [analysis.effectiveValue]);

  // When the segmented control changes, update scope and trigger onValueChange
  const setScope = useCallback(
    (strScope: string) => {
      const scope = strScope as PropertyValueScope;
      // Update local state immediately for responsive UI
      setLocalScope(scope);

      setHasPendingValue(scope === "template");

      // This triggers an expensive operation in parent, so defer it
      requestIdleCallback(() => {
        onValueChange(scope, scope === "template" ? undefined : localValue);
        setHasPendingValue(false);
      });
    },
    [localValue, onValueChange],
  );

  // The widget for the input field, passed in from props
  const inputField = useMemo(
    () =>
      renderInput(inputKey, localValue, (value) => {
        setLocalValue(value);

        if (analysis.hasMixedValues && analysis.hasMixedScopes) {
          setLocalScope("instance");
        }

        // Often the input can have rapid changes, like text inputs, so debounce
        // them
        if (debounceMs !== undefined) {
          debouncedSetValue(value);
        } else {
          setValue(value);
        }
      }),
    [
      inputKey,
      renderInput,
      localValue,
      analysis.hasMixedValues,
      analysis.hasMixedScopes,
      debouncedSetValue,
      debounceMs,
      setValue,
    ],
  );

  const handleReset = useCallback(() => {
    if (defaultValue !== undefined) {
      setLocalValue(defaultValue);
      setResetCounter((prev) => prev + 1);
      if (debounceMs !== undefined) {
        debouncedSetValue(defaultValue);
      } else {
        setValue(defaultValue);
      }
    }
  }, [defaultValue, debounceMs, debouncedSetValue, setValue]);

  const scopes = useMemo(() => {
    const scopes = [];
    if (localScope === "mixed") {
      scopes.push({
        label: (
          <Group gap={4} wrap="nowrap">
            <IconAlertTriangle size={14} />
            <Text size="xs">Mixed</Text>
          </Group>
        ),
        value: "mixed",
      });
    }

    scopes.push(
      ...[
        {
          label: (
            <Group gap={4} wrap="nowrap">
              <IconCircleFilled size={14} />
              <Text size="xs">Unique</Text>
            </Group>
          ),
          value: "instance",
        },
        {
          label: (
            <Group gap={4} wrap="nowrap">
              <IconCirclesFilled size={14} />
              <Text size="xs">Shared</Text>
            </Group>
          ),
          value: "template",
        },
      ],
    );
    return scopes;
  }, [localScope]);

  // No template implies only instance-level editing, so it doesn't make sense
  // to change the instance values of multiple objects at once since they likely
  // have different values.
  if (noTemplate && values.length > 1) {
    return null;
  }

  // Uncontrolled = more performant
  const isControlled = "value" in (inputField.props as any);
  if (isControlled) {
    throw new Error("renderInput should only return uncontrolled components.");
  }

  return (
    <Stack gap="xs" p={0}>
      {label && (
        <div>
          <Input.Label>{label}</Input.Label>
          {tooltip && <InfoTooltip>{tooltip}</InfoTooltip>}
          {description && <Input.Description>{description}</Input.Description>}
        </div>
      )}

      {!noTemplate && (
        <SegmentedControl
          p={0}
          value={localScope}
          onChange={setScope}
          size="xs"
          data={scopes}
          color={
            localScope === "mixed"
              ? "orange"
              : localScope === "template"
                ? "grape"
                : "cyan"
          }
          styles={{
            root: {
              backgroundColor: "transparent",
            },
          }}
        />
      )}

      {analysis.hasMixedValues && (
        <Alert
          p="xs"
          variant="light"
          color="orange"
          icon={<IconAlertTriangle size={16} />}
        >
          Changing this property will set the same value for all selected
          objects
        </Alert>
      )}

      <Box pos="relative">
        <LoadingOverlay
          visible={hasPendingValue}
          zIndex={1000}
          overlayProps={overlayProps}
          loaderProps={{ type: "bars", size: "xs" }}
        />
        <ResettableInput
          disabled={
            localValue !== undefined
              ? areEqual(defaultValue!, localValue)
              : defaultValue === localValue
          }
          onReset={handleReset}
        >
          {inputField}
        </ResettableInput>
      </Box>
    </Stack>
  );
}

/**
 * Wrapper component that automatically generates a stable key based on the values prop.
 * This ensures the component remounts when the selection changes, resetting internal state.
 */
export default function PropertyValue<T>(props: PropertyValueProps<T>) {
  // Generate a stable key based on the values array and label
  // This will change whenever the selection changes, forcing a remount
  const key = useMemo(() => {
    const keyParts = props.values.map((v) => v.key);
    // Include the label to distinguish between different properties
    if (props.label) {
      keyParts.push(props.label);
    }
    return keyParts.length > 0 ? x64.hash128(keyParts.join(",")) : "empty";
  }, [props.values, props.label]);

  return (
    <ErrorBoundary
      fallback={
        <Alert title="Error">
          {props.label ?? "Property"} failed to render, see dev console.
        </Alert>
      }
    >
      <PropertyValueInner key={key} refreshKey={key} {...props} />
    </ErrorBoundary>
  );
}
