import { AnimationInstance } from "@/types/map";
import { AnimationProps } from "@/types/properties";
import {
  collectPropertyValues,
  updateObjectProperties,
  updateTilesetTemplates,
} from "@/utils/propertyEditor";
import { createPropertyKey, createPropsEqualFn } from "@/utils/propertyKey";
import {
  ActionIcon,
  Box,
  ColorInput,
  Fieldset,
  Group,
  Slider,
  Stack,
  Switch,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { IconCopy } from "@tabler/icons-react";
import { memo, ReactElement, useCallback, useMemo } from "react";
import AdvancedSection from "../common/AdvancedSection";
import PropertyValue, { PropertyValueScope } from "../PropertyValue";

// Properties that collectPropertyValues needs to access
const COLLECTED_PROPS = [
  "tags",
  "flipX",
  "tint",
  "loop",
  "hidden",
  "groundOffset",
] as const;

// Additional properties needed for template resolution
const TEMPLATE_PROPS = ["id", "tsObjId", "tilesetId"] as const;

// All properties relevant for memo comparison
const RELEVANT_PROPS = [...TEMPLATE_PROPS, ...COLLECTED_PROPS] as const;

function AnimationProperties({ objs }: { objs: AnimationInstance[] }) {
  // Create a key based only on relevant properties
  const propertyKey = createPropertyKey(objs, RELEVANT_PROPS);

  const toCollect = useMemo(() => {
    return collectPropertyValues(objs, [...COLLECTED_PROPS]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyKey]);

  const updateProps = useCallback(
    (scope: PropertyValueScope, props: Partial<AnimationProps>) => {
      updateObjectProperties({
        scope,
        objs,
        props,
        templateUpdate: updateTilesetTemplates,
      });
    },
    [objs],
  );

  const flipXInput = (
    <PropertyValue
      label="Flip X"
      description="Whether to flip the animation horizontally."
      values={toCollect.flipX}
      defaultValue={false}
      onValueChange={(
        scope: PropertyValueScope,
        value: boolean | undefined,
      ): void => {
        updateProps(scope, { flipX: value });
      }}
      renderInput={(
        key: string,
        value: boolean | undefined,
        onChange: (value: boolean) => void,
      ): ReactElement => {
        return (
          <Switch
            key={key}
            defaultChecked={value ?? false}
            onChange={(e) => onChange(e.currentTarget.checked)}
          />
        );
      }}
    />
  );

  const tintInput = (
    <PropertyValue
      label="Tint"
      description="A color tint to apply to this animation."
      values={toCollect.tint}
      onValueChange={(scope, value: string | null | undefined) => {
        updateProps(scope, { tint: value });
      }}
      defaultValue={null}
      debounceMs={100}
      renderInput={(
        key: string,
        value: string | null | undefined,
        onChange: (value: string) => void,
      ): ReactElement => {
        const hexColor = value ? `#${value}` : "";

        return (
          <ColorInput
            key={key}
            format="hex"
            defaultValue={hexColor}
            onChange={(hex) => {
              onChange(hex.replace("#", ""));
            }}
          />
        );
      }}
    />
  );

  const loopInput = (
    <PropertyValue
      label="Loop"
      description="Whether this animation loops continuously."
      values={toCollect.loop}
      defaultValue={false}
      onValueChange={(
        scope: PropertyValueScope,
        value: boolean | undefined,
      ): void => {
        updateProps(scope, { loop: value });
      }}
      renderInput={(
        key: string,
        value: boolean | undefined,
        onChange: (value: boolean) => void,
      ): ReactElement => {
        return (
          <Switch
            key={key}
            defaultChecked={value ?? false}
            onChange={(e) => onChange(e.currentTarget.checked)}
          />
        );
      }}
    />
  );

  const hiddenInput = (
    <PropertyValue
      label="Hidden"
      description="Whether this animation starts off hidden on the map."
      values={toCollect.hidden}
      defaultValue={false}
      onValueChange={(
        scope: PropertyValueScope,
        value: boolean | undefined,
      ): void => {
        updateProps(scope, { hidden: value });
      }}
      renderInput={(
        key: string,
        value: boolean | undefined,
        onChange: (value: boolean) => void,
      ): ReactElement => {
        return (
          <Switch
            key={key}
            defaultChecked={value ?? false}
            onChange={(e) => onChange(e.currentTarget.checked)}
          />
        );
      }}
    />
  );

  const groundOffsetInput = (
    <PropertyValue
      label="Ground offset"
      description="Vertical offset of the animation from the ground."
      values={toCollect.groundOffset}
      defaultValue={0}
      debounceMs={100}
      onValueChange={(
        scope: PropertyValueScope,
        value: number | undefined,
      ): void => {
        updateProps(scope, { groundOffset: value });
      }}
      renderInput={(
        key: string,
        value: number | undefined,
        onChange: (value: number) => void,
      ): ReactElement => {
        return (
          <Slider
            key={key}
            defaultValue={value ?? 0}
            onChange={onChange}
            min={-16}
            max={16}
            step={1}
          />
        );
      }}
    />
  );

  let idInput;
  if (objs.length === 1) {
    const copyId = () => {
      navigator.clipboard.writeText(objs[0].id);
    };

    idInput = (
      <Group gap="xs" wrap="nowrap">
        <Box style={{ flex: 1 }}>
          <TextInput
            label="ID"
            description="The object's unique identifier."
            value={objs[0].id}
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

  return (
    <Fieldset legend="Animation properties" mt="md" p="xs">
      <Stack p={0} gap="xl">
        {flipXInput}
        {tintInput}
        {loopInput}
        {hiddenInput}
        {groundOffsetInput}
        <AdvancedSection>{idInput}</AdvancedSection>
      </Stack>
    </Fieldset>
  );
}

export default memo(
  AnimationProperties,
  createPropsEqualFn<AnimationInstance>(RELEVANT_PROPS),
);
