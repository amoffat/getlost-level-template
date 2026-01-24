import * as constants from "@/constants";
import { useAppDispatch } from "@/hooks/redux";
import { actions as mapEditorActions } from "@/slices/mapEditor";
import { LightObj } from "@/types/map";
import { LightProps } from "@/types/properties";
import {
  collectPropertyValues,
  updateObjectProperties,
} from "@/utils/propertyEditor";
import { createPropertyKey, createPropsEqualFn } from "@/utils/propertyKey";
import {
  ColorInput,
  Fieldset,
  Slider,
  Stack,
  Switch,
  TextInput,
} from "@mantine/core";
import { memo, ReactNode, useCallback, useMemo } from "react";
import PropertyValue, { PropertyValueLevel } from "../PropertyValue";

// Properties that collectPropertyValues needs to access
const COLLECTED_PROPS = ["color", "intensity", "name", "offDuringDay"] as const;

// Additional properties needed for identification
const TEMPLATE_PROPS = ["id"] as const;

// All properties relevant for memo comparison
const RELEVANT_PROPS = [...TEMPLATE_PROPS, ...COLLECTED_PROPS] as const;

function LightProperties({ objs }: { objs: LightObj[] }) {
  const dispatch = useAppDispatch();

  // Create a key based only on relevant properties
  const propertyKey = createPropertyKey(objs, RELEVANT_PROPS);

  // All light objects use the same global light template
  const templateUpdate = useCallback(
    (_objs: LightObj[], props: Partial<LightProps>) => {
      dispatch(
        mapEditorActions.updateTemplate({
          name: "lights",
          updates: props,
        }),
      );
    },
    [dispatch],
  );

  const updateProps = useCallback(
    (level: PropertyValueLevel, props: Partial<LightProps>) => {
      updateObjectProperties({
        level,
        objs,
        props,
        templateUpdate,
      });
    },
    [objs, templateUpdate],
  );

  const toCollect = useMemo(() => {
    return collectPropertyValues(objs, [...COLLECTED_PROPS]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyKey]);

  const nameInput = (
    <PropertyValue
      label="Name"
      description="A name for the light. Does not have to be unique."
      noTemplate
      values={toCollect.name}
      defaultValue=""
      onValueChange={(
        level: PropertyValueLevel,
        value: string | undefined,
      ): void => {
        updateProps(level, { name: value });
      }}
      renderInput={(
        value: string | undefined,
        onChange: (value: string) => void,
      ): ReactNode => {
        return (
          <TextInput
            value={value ?? ""}
            placeholder="Enter name"
            onChange={(e) => onChange(e.target.value)}
          />
        );
      }}
    />
  );

  const colorInput = (
    <PropertyValue
      label="Color"
      noTemplate
      description="The RGB color of the light"
      values={toCollect.color}
      defaultValue={constants.defaultLightColor}
      onValueChange={(level, value: string | undefined) => {
        updateProps(level, { color: value });
      }}
      renderInput={(
        value: string | undefined,
        onChange: (value: string) => void,
      ): ReactNode => {
        const hexColor = value ? `#${value}` : undefined;

        return (
          <ColorInput
            format="hex"
            value={hexColor}
            onChange={(hex) => {
              onChange(hex.replace("#", ""));
            }}
          />
        );
      }}
    />
  );

  const intensityInput = (
    <PropertyValue
      label="Intensity"
      description="The brightness of the light"
      noTemplate
      values={toCollect.intensity}
      defaultValue={constants.defaultLightIntensity}
      onValueChange={(level, value: number | undefined) => {
        updateProps(level, { intensity: value });
      }}
      renderInput={(
        value: number | undefined,
        onChange: (value: number) => void,
      ): ReactNode => {
        return (
          <Slider
            value={value}
            min={0}
            max={3}
            step={0.01}
            onChange={onChange}
          />
        );
      }}
    />
  );

  const offDuringDayInput = (
    <PropertyValue
      label="Off during day"
      description="Whether the light is off during the day"
      noTemplate
      values={toCollect.offDuringDay}
      defaultValue={false}
      onValueChange={(
        level: PropertyValueLevel,
        value: boolean | undefined,
      ): void => {
        updateProps(level, { offDuringDay: value });
      }}
      renderInput={(
        value: boolean | undefined,
        onChange: (value: boolean) => void,
      ): ReactNode => {
        return (
          <Switch
            checked={value ?? false}
            onChange={(e) => onChange(e.currentTarget.checked)}
          />
        );
      }}
    />
  );

  return (
    <Fieldset legend="Light properties" mt="md" p="xs">
      <Stack p={0} gap="xl">
        {nameInput}
        {colorInput}
        {intensityInput}
        {offDuringDayInput}
      </Stack>
    </Fieldset>
  );
}

export default memo(
  LightProperties,
  createPropsEqualFn<LightObj>(RELEVANT_PROPS),
);
