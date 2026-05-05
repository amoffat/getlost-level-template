import { useAppDispatch } from "@/hooks/redux";
import { actions as mapEditorActions } from "@/slices/mapEditor";
import { MapObjType, SinkZoneObj } from "@/types/map";
import { createPropsEqualFn } from "@/utils/propertyKey";
import { Slider } from "@mantine/core";
import { memo, ReactElement, useCallback } from "react";
import { useTranslation } from "react-i18next";
import PropertyValue, {
  PropertyValueInfo,
  PropertyValueScope,
} from "../../PropertyValue";
import BaseZoneProperties from "./BaseZoneProperties";

const RELEVANT_PROPS = ["id", "name", "depth", "padding"] as const;

function SinkZoneProperties({ objs }: { objs: SinkZoneObj[] }) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const updateObjs = useCallback(
    (changes: Partial<SinkZoneObj>) => {
      dispatch(
        mapEditorActions.updateMany(objs.map((o) => ({ id: o.id, changes }))),
      );
    },
    [dispatch, objs],
  );

  const depthValues: PropertyValueInfo<number>[] = objs.map((o) => ({
    key: o.id,
    value: o.depth,
    scope: "instance",
  }));

  const paddingValues: PropertyValueInfo<number>[] = objs.map((o) => ({
    key: o.id,
    value: o.padding,
    scope: "instance",
  }));

  const depthInput = (
    <PropertyValue
      label={t("sinkZonePropDepthLabel")}
      description={t("sinkZoneDepthDescription")}
      noTemplate
      values={depthValues}
      defaultValue={1}
      debounceMs={100}
      onValueChange={({
        value,
      }: {
        scope: PropertyValueScope;
        value: number | undefined;
      }) => {
        updateObjs({ depth: value });
      }}
      renderInput={({ key, defaultValue: value, onChange }): ReactElement => (
        <Slider
          key={key}
          defaultValue={value}
          min={0}
          max={10}
          step={0.1}
          onChange={onChange}
        />
      )}
    />
  );

  const paddingInput = (
    <PropertyValue
      label={t("zonePaddingLabel")}
      description={t("zonePaddingDescription")}
      noTemplate
      values={paddingValues}
      defaultValue={0}
      debounceMs={100}
      onValueChange={({
        value,
      }: {
        scope: PropertyValueScope;
        value: number | undefined;
      }) => {
        updateObjs({ padding: value });
      }}
      renderInput={({ key, defaultValue: value, onChange }): ReactElement => (
        <Slider
          key={key}
          defaultValue={value}
          min={0}
          max={100}
          step={1}
          onChange={onChange}
        />
      )}
    />
  );

  return (
    <BaseZoneProperties
      objs={objs}
      legend={t("sinkZonePropLegend")}
      zoneType={MapObjType.SinkZone}
      updateObjs={updateObjs}
    >
      {depthInput}
      {paddingInput}
    </BaseZoneProperties>
  );
}

export default memo(
  SinkZoneProperties,
  createPropsEqualFn<SinkZoneObj>(RELEVANT_PROPS),
);
