import * as constants from "@/constants";
import { WalkSound, walkSounds } from "@/constants";
import { useAppSelector } from "@/hooks/redux";
import { collectPropertyValues } from "@/store/selectors";
import { MapLayerName } from "@/types/layer";
import { TileGroupInstance } from "@/types/map";
import { TileGroupProps } from "@/types/properties";
import {
  updateObjectOrTemplate,
  updateTilesetTemplates,
} from "@/utils/propertyEditor";
import { createPropsEqualFn } from "@/utils/propertyKey";
import { Fieldset, Select, Slider, Stack } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import { memo, ReactElement, useCallback } from "react";
import { useTranslation } from "react-i18next";
import PropertyValue, { PropertyValueScope } from "../PropertyValue";
import FlipXInput from "./inputs/FlipXInput";
import GroundOffsetInput from "./inputs/GroundOffsetInput";
import HiddenInput from "./inputs/HiddenInput";
import LocalizedNameInput from "./inputs/LocalizedNameInput";
import SwitchInput from "./inputs/SwitchInput";
import TintInput from "./inputs/TintInput";

// Properties that collectPropertyValues needs to access
const COLLECTED_PROPS = [
  "id",
  "nameKey",
  "talkable",
  "flipX",
  "tint",
  "hidden",
  "walkSound",
  "friction",
  "traction",
  "groundOffset",
] as const;

// Additional properties needed for template resolution
const TEMPLATE_PROPS = ["tsObjId", "tilesetId"] as const;

// All properties relevant for memo comparison
const RELEVANT_PROPS = [...TEMPLATE_PROPS, ...COLLECTED_PROPS] as const;

function TileGroupProperties({ objs }: { objs: TileGroupInstance[] }) {
  const { t } = useTranslation();
  const groundLayer = useAppSelector(
    (state) => state.mapEditor.layers.active === MapLayerName.Ground,
  );

  const toCollect = useAppSelector((state) =>
    collectPropertyValues(state, objs, [...COLLECTED_PROPS]),
  );

  const updateProps = useCallback(
    (scope: PropertyValueScope, props: Partial<TileGroupProps>) => {
      updateObjectOrTemplate({
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
      description={t("tileGroupPropNameDescription")}
      values={toCollect.nameKey}
      context={t("tileGroupPropNameContext")}
      keyPrefix={["tg"]}
      onValueChange={({ scope, value }): void => {
        updateProps(scope, {
          nameKey: value,
        });
      }}
    />
  );

  const talkableInput = (
    <SwitchInput
      label={t("talkableLabel")}
      noTemplate
      description={t("talkableDescription")}
      values={toCollect.talkable}
      onValueChange={({ scope, value }) =>
        updateProps(scope, { talkable: value })
      }
    />
  );

  const walkSoundInput = (
    <PropertyValue
      label={t("tileGroupPropWalkSoundLabel")}
      description={t("tileGroupPropWalkSoundDescription")}
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
        const isMixed = value === undefined;
        return (
          <Select
            key={key}
            data={[...walkSounds]}
            defaultValue={value ?? null}
            placeholder={
              isMixed
                ? t("tileGroupPropWalkSoundMixedValues")
                : t("tileGroupPropWalkSoundPlaceholder")
            }
            leftSection={isMixed ? <IconAlertTriangle size={14} /> : undefined}
            onChange={(val) => {
              if (val !== null) onChange(val as WalkSound);
            }}
          />
        );
      }}
    />
  );

  const frictionInput = (
    <PropertyValue
      label={t("tileGroupPropFrictionLabel")}
      description={t("tileGroupPropFrictionDescription")}
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
      label={t("tileGroupPropTractionLabel")}
      description={t("tileGroupPropTractionDescription")}
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
      description={t("tileGroupPropTintDescription")}
      values={toCollect.tint}
      onValueChange={({ scope, value }) => updateProps(scope, { tint: value })}
    />
  );

  const hiddenInput = (
    <HiddenInput
      description={t("tileGroupPropHiddenDescription")}
      values={toCollect.hidden}
      onValueChange={({ scope, value }) =>
        updateProps(scope, { hidden: value })
      }
    />
  );

  const groundOffsetInput = (
    <GroundOffsetInput
      description={t("tileGroupPropGroundOffsetDescription")}
      values={toCollect.groundOffset}
      onValueChange={({ scope, value }) =>
        updateProps(scope, { groundOffset: value })
      }
      min={0}
    />
  );

  return (
    <Fieldset legend={t("tileGroupPropLegend")} p="xs">
      <Stack p={0} gap="xl">
        {nameInput}
        {talkableInput}
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
