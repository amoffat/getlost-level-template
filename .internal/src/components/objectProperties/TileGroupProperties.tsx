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
import { IconAlertTriangle } from "@tabler/icons-react";
import { memo, ReactElement, useCallback, useMemo } from "react";
import PropertyValue, { PropertyValueScope } from "../PropertyValue";

// Properties that collectPropertyValues needs to access
const COLLECTED_PROPS = [
  "name",
  "tint",
  "hidden",
  "walkSound",
  "friction",
  "traction",
  "groundOffset",
] as const;

// Additional properties needed for template resolution
const TEMPLATE_PROPS = ["id", "tsObjId", "tilesetId"] as const;

// All properties relevant for memo comparison
const RELEVANT_PROPS = [...TEMPLATE_PROPS, ...COLLECTED_PROPS] as const;

function TileGroupProperties({ objs }: { objs: TileGroupInstance[] }) {
  const groundLayer = useAppSelector(
    (state) => state.mapEditor.layers.active === MapLayerName.Ground,
  );

  // Create a key based only on relevant properties
  const propertyKey = createPropertyKey(objs, RELEVANT_PROPS);

  const toCollect = useMemo(() => {
    return collectPropertyValues(objs, [...COLLECTED_PROPS]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyKey]);

  const updateProps = useCallback(
    (scope: PropertyValueScope, props: Partial<TileGroupProps>) => {
      updateObjectProperties({
        scope,
        objs,
        props,
        templateUpdate: updateTilesetTemplates,
      });
    },
    [objs],
  );

  const nameInput = (
    <PropertyValue
      label="Name"
      description="A name for this object. Does not have to be unique."
      values={toCollect.name}
      onValueChange={(
        scope: PropertyValueScope,
        value: string | undefined,
      ): void => {
        updateProps(scope, { name: value });
      }}
      debounceMs={100}
      defaultValue=""
      renderInput={(
        key: string,
        value: string | undefined,
        onChange: (value: string) => void,
      ): ReactElement => {
        return (
          <TextInput
            key={key}
            leftSection={value === undefined && <IconAlertTriangle size={14} />}
            defaultValue={value ?? ""}
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
        scope: PropertyValueScope,
        value: WalkSound | undefined,
      ): void {
        updateProps(scope, { walkSound: value });
      }}
      defaultValue={constants.defaultWalkSound}
      debounceMs={100}
      renderInput={(
        key: string,
        value: WalkSound | undefined,
        onChange: (value: WalkSound) => void,
      ): ReactElement => {
        return (
          <Select
            key={key}
            data={walkSounds}
            leftSection={value === undefined && <IconAlertTriangle size={14} />}
            defaultValue={value ?? undefined}
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
        scope: PropertyValueScope,
        value: number | undefined,
      ): void {
        updateProps(scope, { friction: value });
      }}
      debounceMs={100}
      defaultValue={constants.defaultFriction}
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
      onValueChange={(scope: PropertyValueScope, value: number | undefined) => {
        updateProps(scope, { traction: value });
      }}
      debounceMs={100}
      defaultValue={constants.defaultTraction}
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
      description="Vertical offset of the object from the ground."
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

export default memo(
  TileGroupProperties,
  createPropsEqualFn<TileGroupInstance>(RELEVANT_PROPS),
);
