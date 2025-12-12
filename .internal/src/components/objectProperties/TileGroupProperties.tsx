import * as constants from "@/constants";
import { WalkSound, walkSounds } from "@/constants";
import { useAppSelector } from "@/hooks/redux";
import { MapLayerName } from "@/types/layer";
import { TileGroupInstance } from "@/types/map";
import { TileGroupProps } from "@/types/properties";
import {
  collectPropertyValues,
  updateObjectProperties,
  updateTilesetTemplates,
} from "@/utils/propertyEditor";
import {
  ColorInput,
  Fieldset,
  Select,
  Slider,
  Stack,
  Switch,
  TextInput,
} from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import { ReactNode, useCallback, useMemo } from "react";
import PropertyValue, { PropertyValueLevel } from "../PropertyValue";

export default function TileGroupProperties({
  objs,
}: {
  objs: TileGroupInstance[];
}) {
  const groundLayer = useAppSelector(
    (state) => state.mapEditor.layers.active === MapLayerName.Ground
  );

  const toCollect = useMemo(() => {
    return collectPropertyValues(objs, [
      "name",
      "tint",
      "hidden",
      "walkSound",
      "friction",
      "traction",
      "groundOffset",
    ]);
  }, [objs]);

  const updateProps = useCallback(
    (level: PropertyValueLevel, props: Partial<TileGroupProps>) => {
      updateObjectProperties({
        level,
        objs,
        props,
        templateUpdate: updateTilesetTemplates,
      });
    },
    [objs]
  );

  const nameInput = (
    <PropertyValue
      label="Name"
      description="A name for this object. Does not have to be unique."
      values={toCollect.name}
      onValueChange={(
        level: PropertyValueLevel,
        value: string | undefined
      ): void => {
        updateProps(level, { name: value });
      }}
      defaultValue=""
      renderInput={(
        value: string | undefined,
        onChange: (value: string) => void
      ): ReactNode => {
        return (
          <TextInput
            leftSection={value === undefined && <IconAlertTriangle size={14} />}
            value={value ?? ""}
            placeholder={value === undefined ? "Mixed values" : "Enter name"}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      }}
    />
  );

  const walkSoundInput = (
    <PropertyValue
      label="Walk sound"
      description="The sound that will play when a character walks on this tile"
      values={toCollect.walkSound}
      onValueChange={function (
        level: PropertyValueLevel,
        value: WalkSound | undefined
      ): void {
        updateProps(level, { walkSound: value });
      }}
      defaultValue={constants.defaultWalkSound}
      renderInput={(
        value: WalkSound | undefined,
        onChange: (value: WalkSound) => void
      ): ReactNode => {
        return (
          <Select
            data={walkSounds}
            leftSection={value === undefined && <IconAlertTriangle size={14} />}
            value={value ?? undefined}
            placeholder={
              value === undefined ? "Mixed values" : "Select walk sound"
            }
            onChange={(val) => {
              if (val) onChange(val as WalkSound);
            }}
          />
        );
      }}
    />
  );

  const frictionInput = (
    <PropertyValue
      label="Friction"
      description="How many seconds it takes for the player's speed to reduce by half."
      values={toCollect.friction}
      onValueChange={function (
        level: PropertyValueLevel,
        value: number | undefined
      ): void {
        updateProps(level, { friction: value });
      }}
      defaultValue={constants.defaultFriction}
      renderInput={(
        value: number | undefined,
        onChange: (value: number) => void
      ): ReactNode => {
        return (
          <Slider
            value={value}
            min={0}
            max={1}
            step={0.01}
            onChange={onChange}
          />
        );
      }}
    />
  );

  const tractionInput = (
    <PropertyValue
      label="Traction"
      description="How much grip this tile provides. Higher values make it easier to change direction."
      values={toCollect.traction}
      onValueChange={(level: PropertyValueLevel, value: number | undefined) => {
        updateProps(level, { traction: value });
      }}
      defaultValue={constants.defaultTraction}
      renderInput={(
        value: number | undefined,
        onChange: (value: number) => void
      ): ReactNode => {
        return (
          <Slider
            value={value}
            min={0}
            max={1}
            step={0.01}
            onChange={onChange}
          />
        );
      }}
    />
  );

  const tintInput = (
    <PropertyValue
      label="Tint"
      description="A color tint to apply to this tile"
      values={toCollect.tint}
      onValueChange={(level, value: string | null | undefined) => {
        updateProps(level, { tint: value });
      }}
      defaultValue={null}
      renderInput={(
        value: string | null | undefined,
        onChange: (value: string) => void
      ): ReactNode => {
        const hexColor = value ? `#${value}` : "";

        return (
          <ColorInput
            format="hex"
            value={hexColor}
            onChange={(hex) => {
              // Remove the hash symbol before storing
              onChange(hex.replace("#", ""));
            }}
          />
        );
      }}
    />
  );

  const hiddenInput = (
    <PropertyValue
      label="Hidden"
      description="Whether this object starts off hidden on the map."
      values={toCollect.hidden}
      defaultValue={false}
      onValueChange={(
        level: PropertyValueLevel,
        value: boolean | undefined
      ): void => {
        updateProps(level, { hidden: value });
      }}
      renderInput={(
        value: boolean | undefined,
        onChange: (value: boolean) => void
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

  const groundOffsetInput = (
    <PropertyValue
      label="Ground offset"
      description="Vertical offset of the object from the ground."
      values={toCollect.groundOffset}
      defaultValue={0}
      onValueChange={(
        level: PropertyValueLevel,
        value: number | undefined
      ): void => {
        updateProps(level, { groundOffset: value });
      }}
      renderInput={(
        value: number | undefined,
        onChange: (value: number) => void
      ): ReactNode => {
        return (
          <Slider
            value={value ?? 0}
            onChange={onChange}
            min={0}
            max={16}
            step={1}
          />
        );
      }}
    />
  );

  return (
    <Fieldset legend="Object properties" mt="md" p="xs">
      <Stack p={0} gap="xl">
        {nameInput}
        {tintInput}
        {hiddenInput}
        {groundLayer && walkSoundInput}
        {groundLayer && frictionInput}
        {groundLayer && tractionInput}
        {!groundLayer && groundOffsetInput}
      </Stack>
    </Fieldset>
  );
}
