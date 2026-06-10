import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { actions as mapEditorActions } from "@/slices/mapEditor";
import { collectPropertyValues } from "@/store/selectors";
import { MapObjType, SinkZoneObj } from "@/types/map";
import { createPropsEqualFn } from "@/utils/propertyKey";
import { Slider } from "@mantine/core";
import { memo, ReactElement, useCallback } from "react";
import { useTranslation } from "react-i18next";
import PropertyValue, { PropertyValueScope } from "../../PropertyValue";
import BaseZoneProperties from "./BaseZoneProperties";

const RELEVANT_PROPS = ["id", "padding", "depth"] as const;

function SinkZoneProperties({ objs }: { objs: SinkZoneObj[] }) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const toCollect = useAppSelector((state) =>
    collectPropertyValues(state, objs, [...RELEVANT_PROPS]),
  );

  const updateObjs = useCallback(
    (changes: Partial<SinkZoneObj>) => {
      dispatch(
        mapEditorActions.updateMany(objs.map((o) => ({ id: o.id, changes }))),
      );
    },
    [dispatch, objs],
  );

  const depthInput = (
    <PropertyValue
      label={t("sinkZonePropDepthLabel")}
      description={t("sinkZoneDepthDescription")}
      noTemplate
      values={toCollect.depth}
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

  return (
    <BaseZoneProperties
      objs={objs}
      legend={t("sinkZonePropLegend")}
      zoneType={MapObjType.SinkZone}
      updateObjs={updateObjs}
    >
      {depthInput}
    </BaseZoneProperties>
  );
}

export default memo(
  SinkZoneProperties,
  createPropsEqualFn<SinkZoneObj>(RELEVANT_PROPS),
);
