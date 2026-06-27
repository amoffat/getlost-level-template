import { overlayProps } from "@/constants";
import { copyToClipboard } from "@/utils/copy";
import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Group,
  Input,
  LoadingOverlay,
  SegmentedControl,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { useDebouncedCallback } from "@mantine/hooks";
import {
  IconAlertTriangle,
  IconCircleFilled,
  IconCircleOff,
  IconCirclesFilled,
  IconCopy,
  IconRestore,
} from "@tabler/icons-react";
import { x64 } from "murmurhash3js";
import {
  ReactElement,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ErrorBoundary } from "react-error-boundary";
import { useTranslation } from "react-i18next";
import InfoTooltip from "./common/InfoTooltip";

export type PropertyValueScope = "template" | "instance" | "mixed";
export type SelectableScope = Extract<
  PropertyValueScope,
  "template" | "instance"
>;

export interface OnValueChangeArgs<T> {
  scope: PropertyValueScope;
  value: T | undefined;
  prevValue: T | undefined;
}

export interface PropertyValueInfo<T> {
  /** Used purely for key generation/stability for react components */
  key: string;
  /** The actual value */
  value: T;
  /** Whether this value is inherited from a template or set on the instance */
  scope: SelectableScope;
}

export interface RenderInputArgs<T> {
  key: string;
  defaultValue: T | undefined;
  onChange: (value: T) => void;
  scope: SelectableScope;
}

interface PropertyValueProps<T> {
  /** Label for the property */
  label?: string;
  /** Description text shown below the label */
  description?: string;
  /** Array of value info from all selected objects */
  values: PropertyValueInfo<T | undefined>[];
  /** The input component to render. Receives the effective value and onChange callback */
  renderInput: (args: RenderInputArgs<T>) => ReactElement;
  /** Callback when the user changes the value */
  onValueChange?: (args: OnValueChangeArgs<T>) => void;
  /** Optional function to determine if two values are equal (defaults to ===) */
  areEqual?: (a: T | undefined, b: T | undefined) => boolean;
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
  /**
   * If true, adds an action button to set the value to undefined, and shows an
   * "undefined" badge next to the label when the value is currently undefined.
   * Useful for properties where the user wants to signal "I don't care / use a
   * derived value" rather than specifying a concrete value.
   */
  allowUndefined?: boolean;
  allowCopy?: boolean;
  noReset?: boolean;
  /** Additional action buttons to display next to the label */
  actionButtons?: ReactNode[];
  required?: boolean;
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
  allowUndefined = false,
  allowCopy = false,
  noReset = false,
  required = false,
  refreshKey,
  actionButtons,
}: PropertyValueProps<T> & { refreshKey: string }) {
  const { t } = useTranslation();
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

    const uniqueValues: (T | undefined)[] = [];
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
  const [isExplicitlyUndefined, setIsExplicitlyUndefined] = useState(
    analysis.effectiveValue === undefined,
  );

  // Tracks the last value passed to onValueChange so prevValue is accurate
  // across re-renders and debounced calls.
  const lastCommittedValue = useRef<T | undefined>(analysis.effectiveValue);

  const copyValue = useCallback(() => {
    if (typeof localValue === "string") {
      copyToClipboard({ value: localValue, t });
    }
  }, [localValue, t]);

  const setValue = useCallback(
    (value: T | undefined) => {
      onValueChange?.({
        scope: noTemplate ? "instance" : localScope,
        value,
        prevValue: lastCommittedValue.current,
      });
      lastCommittedValue.current = value;
    },
    [localScope, noTemplate, onValueChange],
  );

  const debouncedSetValue = useDebouncedCallback((value: T | undefined) => {
    setValue(value);
  }, debounceMs ?? 0);

  // Sync local state when the effective value changes from outside
  useEffect(() => {
    queueMicrotask(() => {
      setLocalValue(analysis.effectiveValue);
    });
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
        const changeValue = scope === "template";
        const newValue = changeValue ? undefined : localValue;
        onValueChange?.({
          scope,
          value: newValue,
          prevValue: lastCommittedValue.current,
        });
        if (changeValue) {
          setLocalValue(newValue);
          setResetCounter((prev) => prev + 1);
        }
        lastCommittedValue.current = newValue;
        setHasPendingValue(false);
      });
    },
    [localValue, onValueChange],
  );

  const handleInputChange = useCallback(
    (value: T) => {
      setIsExplicitlyUndefined(false);
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
    },
    [
      analysis.hasMixedValues,
      analysis.hasMixedScopes,
      debounceMs,
      debouncedSetValue,
      setValue,
    ],
  );

  // The widget for the input field, passed in from props
  const inputField = useMemo(
    () =>
      renderInput({
        key: inputKey,
        defaultValue: localValue,
        scope: localScope === "mixed" ? "instance" : localScope,
        onChange: handleInputChange,
      }),
    [inputKey, renderInput, localValue, localScope, handleInputChange],
  );

  const handleReset = useCallback(() => {
    if (defaultValue !== undefined) {
      setIsExplicitlyUndefined(false);
      setLocalValue(defaultValue);
      setResetCounter((prev) => prev + 1);
      if (debounceMs !== undefined) {
        debouncedSetValue(defaultValue);
      } else {
        setValue(defaultValue);
      }
    }
  }, [defaultValue, debounceMs, debouncedSetValue, setValue]);

  const handleSetUndefined = useCallback(() => {
    setIsExplicitlyUndefined(true);
    setLocalValue(undefined);
    setResetCounter((prev) => prev + 1);
    setValue(undefined);
  }, [setValue]);

  const scopes = useMemo(() => {
    const scopes = [];
    if (localScope === "mixed") {
      scopes.push({
        label: (
          <Tooltip
            label="Some objects have a unique value, while others share a value. Changing this will set the same value for all selected objects."
            withArrow
            multiline
            openDelay={500}
            w={200}
          >
            <Group gap={4} wrap="nowrap">
              <IconAlertTriangle size={14} />
              <Text size="xs">Mixed</Text>
            </Group>
          </Tooltip>
        ),
        value: "mixed",
      });
    }

    scopes.push(
      ...[
        {
          label: (
            <Tooltip
              label="This property is unique to each object. Changing it will only affect the currently selected objects."
              withArrow
              multiline
              openDelay={500}
              w={200}
            >
              <Group gap={4} wrap="nowrap">
                <IconCircleFilled size={14} />
                <Text size="xs">Unique</Text>
              </Group>
            </Tooltip>
          ),
          value: "instance",
        },
        {
          label: (
            <Tooltip
              label="This property is shared across multiple objects. Changing it will affect all objects that share this value."
              withArrow
              multiline
              openDelay={500}
              w={200}
            >
              <Group gap={4} wrap="nowrap">
                <IconCirclesFilled size={14} />

                <Text size="xs">Shared</Text>
              </Group>
            </Tooltip>
          ),
          value: "template",
        },
      ],
    );
    return scopes;
  }, [localScope]);

  // Uncontrolled = more performant
  const isControlled = "value" in (inputField.props as any);
  if (isControlled) {
    throw new Error("renderInput should only return uncontrolled components.");
  }

  const isResetDisabled = isExplicitlyUndefined
    ? defaultValue === undefined
    : localValue !== undefined
      ? areEqual(defaultValue!, localValue)
      : defaultValue === localValue;

  return (
    <Stack gap="xs" p={0}>
      {label && (
        <div>
          <Group gap={4} align="center" wrap="nowrap">
            <Input.Label mb={0} required={required}>
              {label}
            </Input.Label>
            {tooltip && <InfoTooltip>{tooltip}</InfoTooltip>}
            {!noReset && (
              <Tooltip label={t("resettableResetTooltip")}>
                <ActionIcon
                  onClick={handleReset}
                  disabled={isResetDisabled}
                  variant="subtle"
                  color="gray"
                  size="sm"
                >
                  <IconRestore size={16} />
                </ActionIcon>
              </Tooltip>
            )}
            {allowUndefined &&
              (isExplicitlyUndefined ? (
                <Badge size="xs" color="gray" variant="light" autoContrast>
                  undefined
                </Badge>
              ) : (
                <Tooltip label={t("propertyValueSetUndefinedTooltip")}>
                  <ActionIcon
                    onClick={handleSetUndefined}
                    variant="subtle"
                    color="gray"
                    size="sm"
                  >
                    <IconCircleOff size={16} />
                  </ActionIcon>
                </Tooltip>
              ))}
            {allowCopy && localValue !== undefined && (
              <Tooltip label={t("copyValueTooltip")}>
                <ActionIcon
                  onClick={copyValue}
                  variant="subtle"
                  color="gray"
                  size="sm"
                >
                  <IconCopy size={16} />
                </ActionIcon>
              </Tooltip>
            )}
            {actionButtons}
          </Group>
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

      {analysis.hasMixedValues && onValueChange && (
        <Alert
          p="xs"
          variant="light"
          color="orange"
          icon={<IconAlertTriangle size={16} />}
        >
          {t("changingPropertyAlert")}
        </Alert>
      )}

      <Box pos="relative">
        <LoadingOverlay
          visible={hasPendingValue}
          zIndex={1000}
          overlayProps={overlayProps}
          loaderProps={{ type: "bars", size: "xs" }}
        />
        {inputField}
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
      <PropertyValueInner<T> key={key} refreshKey={key} {...props} />
    </ErrorBoundary>
  );
}
