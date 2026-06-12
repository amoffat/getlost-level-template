import * as constants from "@/constants";
import { useAppSelector } from "@/hooks/redux";
import { collectPropertyValues } from "@/store/selectors";
import { NpcInstance } from "@/types/map";
import { NpcProps } from "@/types/properties";
import {
  updateObjectOrTemplate,
  updateTilesetTemplates,
} from "@/utils/propertyEditor";
import { createPropsEqualFn } from "@/utils/propertyKey";
import { Fieldset, Slider, Stack } from "@mantine/core";
import { memo, ReactElement, useCallback } from "react";
import { useTranslation } from "react-i18next";
import PropertyValue, { PropertyValueScope } from "../PropertyValue";
import GroundOffsetInput from "./inputs/GroundOffsetInput";
import IdInput from "./inputs/IdInput";
import LocalizedLineInput from "./inputs/LocalizedLineInput";

// Properties that collectPropertyValues needs to access
const COLLECTED_PROPS = [
  "id",
  "nameKey",
  "walkSpeed",
  "dampenWalkCollisions",
  "groundOffset",
] as const;

// Additional properties needed for template resolution
const TEMPLATE_PROPS = ["tsObjId", "tilesetId"] as const;

// All properties relevant for memo comparison
const RELEVANT_PROPS = [...TEMPLATE_PROPS, ...COLLECTED_PROPS] as const;

function NpcProperties({ objs }: { objs: NpcInstance[] }) {
  const { t } = useTranslation();
  const toCollect = useAppSelector((state) =>
    collectPropertyValues(state, objs, [...COLLECTED_PROPS]),
  );

  const updateProps = useCallback(
    (scope: PropertyValueScope, props: Partial<NpcProps>) => {
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
    <LocalizedLineInput
      description={t("npcPropNameDescription")}
      values={toCollect.nameKey}
      context={t("npcPropNameContext")}
      keyPrefix={["char"]}
      onValueChange={({ scope, value }): void => {
        updateProps(scope, {
          nameKey: value,
        });
      }}
      required
    />
  );

  const walkSpeedInput = (
    <PropertyValue
      label={t("npcPropWalkSpeedLabel")}
      description={t("npcPropWalkSpeedDescription")}
      values={toCollect.walkSpeed}
      defaultValue={constants.defaultNpcWalkSpeed}
      onValueChange={({
        scope,
        value,
      }: {
        scope: PropertyValueScope;
        value: number | undefined;
      }): void => {
        updateProps(scope, { walkSpeed: value });
      }}
      debounceMs={100}
      renderInput={({ key, defaultValue: value, onChange }): ReactElement => {
        return (
          <Slider
            key={key}
            defaultValue={value ?? 0}
            onChange={onChange}
            min={0}
            max={1}
            step={0.01}
          />
        );
      }}
    />
  );

  const dampenWalkCollisionsInput = (
    <PropertyValue
      label={t("npcPropDampenWalkCollisionsLabel")}
      description={t("npcPropDampenWalkCollisionsDescription")}
      values={toCollect.dampenWalkCollisions}
      defaultValue={constants.defaultNpcDampen}
      onValueChange={({
        scope,
        value,
      }: {
        scope: PropertyValueScope;
        value: number | undefined;
      }): void => {
        updateProps(scope, { dampenWalkCollisions: value });
      }}
      debounceMs={100}
      renderInput={({ key, defaultValue: value, onChange }): ReactElement => {
        return (
          <Slider
            key={key}
            defaultValue={value ?? 0}
            onChange={onChange}
            min={0}
            max={1}
            step={0.01}
          />
        );
      }}
    />
  );

  const groundOffsetInput = (
    <GroundOffsetInput
      description={t("npcPropGroundOffsetDescription")}
      tooltip={t("npcPropGroundOffsetTooltip")}
      values={toCollect.groundOffset}
      onValueChange={({ scope, value }) =>
        updateProps(scope, { groundOffset: value })
      }
    />
  );

  const idInput = <IdInput values={toCollect.id} />;

  return (
    <Fieldset legend={t("npcPropLegend")} p="xs">
      <Stack p={0} gap="xl">
        {idInput}
        {nameInput}
        {walkSpeedInput}
        {groundOffsetInput}
        {dampenWalkCollisionsInput}
      </Stack>
    </Fieldset>
  );
}

export default memo(
  NpcProperties,
  createPropsEqualFn<NpcInstance>(RELEVANT_PROPS),
);
