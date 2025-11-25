import { useAppDispatch } from "@/hooks/redux";
import { actions as mapEditorActions } from "@/slices/mapEditor";
import { store } from "@/store/store";
import { RgbColor } from "@/types/color";
import { LightObj } from "@/types/map";
import { LightProps } from "@/types/properties";
import { hexToRgb, rgbToHex } from "@/utils/color";
import {
  collectPropertyValues,
  updateObjectProperties,
} from "@/utils/propertyEditor";
import { ColorInput, Fieldset, Slider, Stack, TextInput } from "@mantine/core";
import { ReactNode, useCallback, useMemo } from "react";
import PropertyValue, { PropertyValueLevel } from "../PropertyValue";

export default function LightProperties({ objs }: { objs: LightObj[] }) {
  const dispatch = useAppDispatch();

  // All light objects use the same global light template
  const updateLightTemplate = useCallback(
    (_objs: LightObj[], props: Partial<LightProps>) => {
      dispatch(
        mapEditorActions.updateTemplate({
          name: "lights",
          updates: props,
        })
      );
    },
    [dispatch]
  );

  const updateProps = useCallback(
    (level: PropertyValueLevel, props: Partial<LightProps>) => {
      updateObjectProperties<LightProps, LightObj>(
        level,
        objs,
        props,
        updateLightTemplate
      );
    },
    [objs, updateLightTemplate]
  );

  const resolveTemplate = (_obj: LightObj): LightProps => {
    const state = store.getState();
    return state.mapEditor.templates.lights;
  };

  const toCollect = useMemo(() => {
    return collectPropertyValues<LightProps, LightObj>(objs, resolveTemplate, [
      "color",
      "intensity",
      "name",
    ]);
  }, [objs]);

  const nameInput = (
    <PropertyValue
      label="Name"
      description="A name for the light. Does not have to be unique."
      noTemplate
      values={toCollect.name}
      onValueChange={(
        level: PropertyValueLevel,
        value: string | undefined
      ): void => {
        updateProps(level, { name: value });
      }}
      renderInput={(
        value: string | null,
        onChange: (value: string) => void
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
      description="The RGB color of the light"
      values={toCollect.color}
      onValueChange={(level, value: RgbColor | undefined) => {
        updateProps(level, { color: value });
      }}
      renderInput={(
        value: RgbColor | null,
        onChange: (value: RgbColor) => void
      ): ReactNode => {
        const hexColor = value ? rgbToHex(value) : "#ffffff";

        return (
          <ColorInput
            format="hex"
            value={hexColor}
            onChange={(hex) => {
              onChange(hexToRgb(hex));
            }}
            swatches={[
              "#ffffff", // White (daylight, bright bulb)
              "#fffaf0", // Warm white (indoor lighting)
              "#ffa500", // Orange (fire, torch, lava)
              "#ff4500", // Red-orange (hot fire, ember)
              "#ffff00", // Yellow (sunlight, lantern)
              "#00ffff", // Cyan (magical, ethereal)
              "#0080ff", // Blue (moonlight, cold magic)
              "#ff00ff", // Magenta (mystical, portal)
              "#00ff00", // Green (toxic, alien)
              "#ff0000", // Red (danger, alarm)
            ]}
          />
        );
      }}
      areEqual={(a, b) => a.r === b.r && a.g === b.g && a.b === b.b}
    />
  );

  const intensityInput = (
    <PropertyValue
      label="Intensity"
      description="The brightness of the light"
      values={toCollect.intensity}
      onValueChange={(level, value: number | undefined) => {
        updateProps(level, { intensity: value });
      }}
      renderInput={(
        value: number | null,
        onChange: (value: number) => void
      ): ReactNode => {
        return (
          <Slider
            defaultValue={value ?? 1.0}
            min={0}
            max={1}
            step={0.01}
            onChangeEnd={onChange}
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
      </Stack>
    </Fieldset>
  );
}
