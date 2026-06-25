import { useCollectPropertyValues } from "@/hooks/useCollectPropertyValues";
import { useAppDispatch } from "@/hooks/redux";
import { actions as mapEditorActions } from "@/slices/mapEditor";
import { MapObjType, SoundZoneObj } from "@/types/map";
import { createPropsEqualFn } from "@/utils/propertyKey";
import { Slider, TextInput } from "@mantine/core";
import { ChangeEvent, memo, ReactElement, useCallback } from "react";
import { useTranslation } from "react-i18next";
import PropertyValue, { PropertyValueScope } from "../../PropertyValue";
import BaseZoneProperties from "./BaseZoneProperties";

const RELEVANT_PROPS = ["id", "sound", "volume"] as const;

function SoundZoneProperties({ objs }: { objs: SoundZoneObj[] }) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const toCollect = useCollectPropertyValues(objs, RELEVANT_PROPS);

  const updateObjs = useCallback(
    (changes: Partial<SoundZoneObj>) => {
      dispatch(
        mapEditorActions.updateMany(objs.map((o) => ({ id: o.id, changes }))),
      );
    },
    [dispatch, objs],
  );

  const soundInput = (
    <PropertyValue
      label={t("soundZonePropSoundLabel")}
      noTemplate
      values={toCollect.sound}
      defaultValue=""
      debounceMs={100}
      onValueChange={({
        value,
      }: {
        scope: PropertyValueScope;
        value: string | undefined;
      }) => {
        updateObjs({ sound: value ?? "" });
      }}
      renderInput={({ key, defaultValue: value, onChange }): ReactElement => (
        <TextInput
          key={key}
          defaultValue={value ?? ""}
          placeholder={t("soundZonePropSoundPlaceholder")}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onChange(e.target.value)
          }
        />
      )}
    />
  );

  const volumeInput = (
    <PropertyValue
      label={t("soundZonePropVolumeLabel")}
      noTemplate
      values={toCollect.volume}
      defaultValue={1}
      debounceMs={100}
      onValueChange={({
        value,
      }: {
        scope: PropertyValueScope;
        value: number | undefined;
      }) => {
        updateObjs({ volume: value });
      }}
      renderInput={({ key, defaultValue: value, onChange }): ReactElement => (
        <Slider
          key={key}
          defaultValue={value}
          min={0}
          max={1}
          step={0.01}
          onChange={onChange}
        />
      )}
    />
  );

  return (
    <BaseZoneProperties
      objs={objs}
      legend={t("soundZonePropLegend")}
      zoneType={MapObjType.SoundZone}
      updateObjs={updateObjs}
    >
      {soundInput}
      {volumeInput}
    </BaseZoneProperties>
  );
}

export default memo(
  SoundZoneProperties,
  createPropsEqualFn<SoundZoneObj>(RELEVANT_PROPS),
);
