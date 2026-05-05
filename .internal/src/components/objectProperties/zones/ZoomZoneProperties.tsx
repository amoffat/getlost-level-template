import { useAppDispatch } from "@/hooks/redux";
import { actions as mapEditorActions } from "@/slices/mapEditor";
import { MapObjType, ZoomZoneObj } from "@/types/map";
import { createPropsEqualFn } from "@/utils/propertyKey";
import { Slider } from "@mantine/core";
import { memo, ReactElement, useCallback } from "react";
import { useTranslation } from "react-i18next";
import PropertyValue, {
  PropertyValueInfo,
  PropertyValueScope,
} from "../../PropertyValue";
import BaseZoneProperties from "./BaseZoneProperties";

const RELEVANT_PROPS = ["id", "name", "zoom", "padding"] as const;

// Logarithmic scale so that zoom=1 (default) sits at the slider midpoint.
// To keep 1 centered, ZOOM_MAX should equal 1/ZOOM_MIN (e.g. 0.2 and 5).
const ZOOM_MIN = 0.35;
const ZOOM_MAX = 3;
const ZOOM_SCALE = (raw: number) =>
  parseFloat((ZOOM_MIN * Math.pow(ZOOM_MAX / ZOOM_MIN, raw)).toFixed(2));
const ZOOM_SCALE_INV = (zoom: number) =>
  Math.log(zoom / ZOOM_MIN) / Math.log(ZOOM_MAX / ZOOM_MIN);

function ZoomZoneProperties({ objs }: { objs: ZoomZoneObj[] }) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const updateObjs = useCallback(
    (changes: Partial<ZoomZoneObj>) => {
      dispatch(
        mapEditorActions.updateMany(objs.map((o) => ({ id: o.id, changes }))),
      );
    },
    [dispatch, objs],
  );

  const zoomValues: PropertyValueInfo<number>[] = objs.map((o) => ({
    key: o.id,
    value: o.zoom ?? 1,
    scope: "instance",
  }));

  const zoomInput = (
    <PropertyValue
      label={t("zoomZonePropZoomLabel")}
      description={t("zoomZonePropZoomDescription")}
      noTemplate
      values={zoomValues}
      defaultValue={1}
      debounceMs={100}
      onValueChange={({
        value,
      }: {
        scope: PropertyValueScope;
        value: number | undefined;
      }) => {
        updateObjs({ zoom: value });
      }}
      renderInput={({ key, defaultValue: value, onChange }): ReactElement => (
        <Slider
          key={key}
          defaultValue={ZOOM_SCALE_INV(value ?? 1)}
          min={0}
          max={1}
          step={0.01}
          scale={ZOOM_SCALE}
          onChange={(raw) => onChange(ZOOM_SCALE(raw))}
        />
      )}
    />
  );

  return (
    <BaseZoneProperties
      objs={objs}
      legend={t("zoomZonePropLegend")}
      zoneType={MapObjType.ZoomZone}
      updateObjs={updateObjs}
    >
      {zoomInput}
    </BaseZoneProperties>
  );
}

export default memo(
  ZoomZoneProperties,
  createPropsEqualFn<ZoomZoneObj>(RELEVANT_PROPS),
);
