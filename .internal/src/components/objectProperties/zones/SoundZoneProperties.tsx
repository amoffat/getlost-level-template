import { useAppDispatch } from "@/hooks/redux";
import { actions as mapEditorActions } from "@/slices/mapEditor";
import { MapObjType, SoundZoneObj } from "@/types/map";
import { createPropsEqualFn } from "@/utils/propertyKey";
import { Slider, TextInput } from "@mantine/core";
import { ChangeEvent, memo, ReactElement, useCallback } from "react";
import { useTranslation } from "react-i18next";
import PropertyValue, {
  PropertyValueInfo,
  PropertyValueScope,
} from "../../PropertyValue";
import BaseZoneProperties from "./BaseZoneProperties";

const RELEVANT_PROPS = ["id", "sound", "padding", "volume"] as const;

function SoundZoneProperties({ objs }: { objs: SoundZoneObj[] }) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const updateObjs = useCallback(
    (changes: Partial<SoundZoneObj>) => {
      dispatch(
        mapEditorActions.updateMany(objs.map((o) => ({ id: o.id, changes }))),
      );
    },
    [dispatch, objs],
  );

  const soundValues: PropertyValueInfo<string>[] = objs.map((o) => ({
    key: o.id,
    value: o.sound ?? "",
    scope: "instance",
  }));

  const volumeValues: PropertyValueInfo<number>[] = objs.map((o) => ({
    key: o.id,
    value: o.volume ?? 1,
    scope: "instance",
  }));

  const soundInput = (
    <PropertyValue
      label={t("soundZonePropSoundLabel")}
      noTemplate
      values={soundValues}
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
      values={volumeValues}
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
