import * as constants from "@/constants";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { actions as mapEditorActions } from "@/slices/mapEditor";
import { collectPropertyValues } from "@/store/selectors";
import { LightFlicker, lightFlickerTypes } from "@/types/lights";
import { LightObj } from "@/types/map";
import { LightProps } from "@/types/properties";
import { updateObjectProperties } from "@/utils/propertyEditor";
import { createPropsEqualFn } from "@/utils/propertyKey";
import { ColorInput,
  Fieldset,
  Select,
  Slider,
  Stack,
  TextInput,
} from "@mantine/core";
import { memo, ReactElement, useCallback } from "react";
import { useTranslation } from 'react-i18next';
import PropertyValue, { PropertyValueScope } from "../PropertyValue";
import SwitchInput from "./inputs/SwitchInput";

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
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const toCollect = useAppSelector((state) =>
    collectPropertyValues(state, objs, [...COLLECTED_PROPS]),
  );

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

  const nameInput = (
    <PropertyValue
      label={t('lightPropNameLabel')}
      description={t('lightPropNameDescription')}
      noTemplate
      values={toCollect.name}
      defaultValue=""
      debounceMs={100}
      onValueChange={({ scope, value }: { scope: PropertyValueScope; value: string | undefined }): void => {
        updateProps(scope, { name: value });
      }}
      renderInput={({
        key,
        defaultValue: value,
        onChange,
      }): ReactElement => {
        return (
          <TextInput
            key={key}
            defaultValue={value ?? ""}
            placeholder={t('lightPropNamePlaceholder')}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      }}
    />
  );

  const colorInput = (
    <PropertyValue
      label={t('lightPropColorLabel')}
      noTemplate
      description={t('lightPropColorDescription')}
      values={toCollect.color}
      defaultValue={constants.defaultLightColor}
      onValueChange={({ scope, value }: { scope: PropertyValueScope; value: string | undefined }) => {
        updateProps(scope, { color: value });
      }}
      debounceMs={100}
      renderInput={({
        key,
        defaultValue: value,
        onChange,
      }): ReactElement => {
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
      label={t('lightPropIntensityLabel')}
      description={t('lightPropIntensityDescription')}
      noTemplate
      values={toCollect.intensity}
      defaultValue={constants.defaultLightIntensity}
      onValueChange={({ scope, value }: { scope: PropertyValueScope; value: number | undefined }) => {
        updateProps(scope, { intensity: value });
      }}
      debounceMs={100}
      renderInput={({
        key,
        defaultValue: value,
        onChange,
      }): ReactElement => {
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
    <SwitchInput
      label={t('lightPropOffDuringDayLabel')}
      description={t('lightPropOffDuringDayDescription')}
      values={toCollect.offDuringDay}
      onValueChange={({ scope, value }) =>
        updateProps(scope, { offDuringDay: value })
      }
      noTemplate
      debounceMs={100}
    />
  );

  const flickerInput = (
    <PropertyValue
      label={t('lightPropFlickerLabel')}
      description={t('lightPropFlickerDescription')}
      noTemplate
      values={toCollect.flicker}
      defaultValue={constants.defaultLightFlicker}
      onValueChange={({ scope, value }: { scope: PropertyValueScope; value: LightFlicker | undefined }): void => {
        updateProps(scope, { flicker: value });
      }}
      debounceMs={100}
      renderInput={({
        key,
        defaultValue: value,
        onChange,
      }): ReactElement => {
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
    <Fieldset legend={t('lightPropLegend')} p="xs">
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
