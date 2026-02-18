import * as constants from "@/constants";
import { useAppDispatch } from "@/hooks/redux";
import { actions as mapEditorActions } from "@/slices/mapEditor";
import { LightFlicker, lightFlickerTypes } from "@/types/lights";
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
  Select,
  Slider,
  Stack,
  Switch,
  TextInput,
} from "@mantine/core";
import { memo, ReactElement, useCallback, useMemo } from "react";
import PropertyValue, { PropertyValueScope } from "../PropertyValue";

// Properties that collectPropertyValues needs to access
const COLLECTED_PROPS = [
  "color",
  "intensity",
  "name",
  "offDuringDay",
  "flicker",
] as const;

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
    (scope: PropertyValueScope, props: Partial<LightProps>) => {
      updateObjectProperties({
        scope,
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
      debounceMs={100}
      onValueChange={(
        scope: PropertyValueScope,
        value: string | undefined,
      ): void => {
        updateProps(scope, { name: value });
      }}
      renderInput={(
        key: string,
        value: string | undefined,
        onChange: (value: string) => void,
      ): ReactElement => {
        return (
          <TextInput
            key={key}
            defaultValue={value ?? ""}
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
      onValueChange={(scope, value: string | undefined) => {
        updateProps(scope, { color: value });
      }}
      debounceMs={100}
      renderInput={(
        key: string,
        value: string | undefined,
        onChange: (value: string) => void,
      ): ReactElement => {
        const hexColor = value ? `#${value}` : undefined;

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

  const intensityInput = (
    <PropertyValue
      label="Intensity"
      description="The brightness of the light"
      noTemplate
      values={toCollect.intensity}
      defaultValue={constants.defaultLightIntensity}
      onValueChange={(scope, value: number | undefined) => {
        updateProps(scope, { intensity: value });
      }}
      debounceMs={100}
      renderInput={(
        key: string,
        value: number | undefined,
        onChange: (value: number) => void,
      ): ReactElement => {
        return (
          <Slider
            key={key}
            defaultValue={value}
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
      debounceMs={100}
      onValueChange={(
        scope: PropertyValueScope,
        value: boolean | undefined,
      ): void => {
        updateProps(scope, { offDuringDay: value });
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

  const flickerInput = (
    <PropertyValue
      label="Flicker"
      description="The flicker pattern of the light"
      noTemplate
      values={toCollect.flicker}
      defaultValue={constants.defaultLightFlicker}
      onValueChange={(
        scope: PropertyValueScope,
        value: LightFlicker | undefined,
      ): void => {
        updateProps(scope, { flicker: value });
      }}
      debounceMs={100}
      renderInput={(
        key: string,
        value: LightFlicker | undefined,
        onChange: (value: LightFlicker) => void,
      ): ReactElement => {
        return (
          <Select
            key={key}
            data={lightFlickerTypes.map((type) => ({
              value: type,
              label: type.charAt(0).toUpperCase() + type.slice(1),
            }))}
            defaultValue={value}
            onChange={(val) => {
              if (val) onChange(val as LightFlicker);
            }}
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
        {flickerInput}
      </Stack>
    </Fieldset>
  );
}

export default memo(
  LightProperties,
  createPropsEqualFn<LightObj>(RELEVANT_PROPS),
);
