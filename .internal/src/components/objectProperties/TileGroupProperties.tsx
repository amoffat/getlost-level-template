import * as constants from "@/constants";
import { WalkSound, walkSounds } from "@/constants";
import { useAppSelector } from "@/hooks/redux";
import { collectPropertyValues } from "@/store/selectors";
import { MapLayerName } from "@/types/layer";
import { TileGroupInstance } from "@/types/map";
import { TileGroupProps } from "@/types/properties";
import {
  updateObjectProperties,
  updateTilesetTemplates,
} from "@/utils/propertyEditor";
import { createPropsEqualFn } from "@/utils/propertyKey";
import { Fieldset, Select, Slider, Stack } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import { memo, ReactElement, useCallback } from "react";
import PropertyValue, { PropertyValueScope } from "../PropertyValue";
import FlipXInput from "./inputs/FlipXInput";
import GroundOffsetInput from "./inputs/GroundOffsetInput";
import HiddenInput from "./inputs/HiddenInput";
import LocalizedNameInput from "./inputs/LocalizedNameInput";
import TintInput from "./inputs/TintInput";

// Properties that collectPropertyValues needs to access
const COLLECTED_PROPS = [
  "nameKey",
  "flipX",
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

  const toCollect = useAppSelector((state) =>
    collectPropertyValues(state, objs, [...COLLECTED_PROPS]),
  );

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
    <LocalizedNameInput
      description="A name for this object. Does not have to be unique."
      values={toCollect.nameKey}
      context="Object name"
      keyPrefix={["tg"]}
      onValueChange={({ scope, value }): void => {
        updateProps(scope, {
          nameKey: value,
        });
      }}
    />
  );

  const walkSoundInput = (
    <PropertyValue
      label="Walk sound"
      description="The sound that will play when a character walks on this tile"
      values={toCollect.walkSound}
      onValueChange={function ({
        scope,
        value,
      }: {
        scope: PropertyValueScope;
        value: WalkSound | undefined;
      }): void {
        updateProps(scope, { walkSound: value });
      }}
      defaultValue={constants.defaultWalkSound}
      debounceMs={100}
      renderInput={({ key, defaultValue: value, onChange }): ReactElement => {
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
      onValueChange={function ({
        scope,
        value,
      }: {
        scope: PropertyValueScope;
        value: number | undefined;
      }): void {
        updateProps(scope, { friction: value });
      }}
      debounceMs={100}
      defaultValue={constants.defaultFriction}
      renderInput={({ key, defaultValue: value, onChange }): ReactElement => {
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
      onValueChange={({
        scope,
        value,
      }: {
        scope: PropertyValueScope;
        value: number | undefined;
      }) => {
        updateProps(scope, { traction: value });
      }}
      debounceMs={100}
      defaultValue={constants.defaultTraction}
      renderInput={({ key, defaultValue: value, onChange }): ReactElement => {
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

  const flipXInput = (
    <FlipXInput
      values={toCollect.flipX}
      onValueChange={({ scope, value }) => updateProps(scope, { flipX: value })}
    />
  );

  const tintInput = (
    <TintInput
      description="A color tint to apply to this tile."
      values={toCollect.tint}
      onValueChange={({ scope, value }) => updateProps(scope, { tint: value })}
    />
  );

  const hiddenInput = (
    <HiddenInput
      description="Whether this object starts off hidden on the map."
      values={toCollect.hidden}
      onValueChange={({ scope, value }) =>
        updateProps(scope, { hidden: value })
      }
    />
  );

  const groundOffsetInput = (
    <GroundOffsetInput
      description="Vertical offset of the object from the ground."
      values={toCollect.groundOffset}
      onValueChange={({ scope, value }) =>
        updateProps(scope, { groundOffset: value })
      }
      min={0}
    />
  );

  return (
    <Fieldset legend="Object properties" p="xs">
      <Stack p={0} gap="xl">
        {nameInput}
        {flipXInput}
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
