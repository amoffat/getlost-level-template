import { useAppDispatch } from "@/hooks/redux";
import { actions as mapEditorActions } from "@/slices/mapEditor";
import { CameraZoneObj, MapObjType } from "@/types/map";
import { createPropsEqualFn } from "@/utils/propertyKey";
import { Vector2 } from "@/vec";
import { Slider } from "@mantine/core";
import { memo, ReactElement, useCallback } from "react";
import { useTranslation } from "react-i18next";
import PropertyValue, {
  PropertyValueInfo,
  PropertyValueScope,
} from "../../PropertyValue";
import Vector2Input from "../inputs/Vector2Input";
import BaseZoneProperties from "./BaseZoneProperties";

const RELEVANT_PROPS = ["id", "zoom", "offset", "padding"] as const;

// Logarithmic scale so that zoom=1 (default) sits at the slider midpoint.
// To keep 1 centered, ZOOM_MAX should equal 1/ZOOM_MIN (e.g. 0.2 and 5).
const ZOOM_MIN = 0.35;
const ZOOM_MAX = 3;
const ZOOM_SCALE = (raw: number) =>
  parseFloat((ZOOM_MIN * Math.pow(ZOOM_MAX / ZOOM_MIN, raw)).toFixed(2));
const ZOOM_SCALE_INV = (zoom: number) =>
  Math.log(zoom / ZOOM_MIN) / Math.log(ZOOM_MAX / ZOOM_MIN);

function CameraZoneProperties({ objs }: { objs: CameraZoneObj[] }) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const updateObjs = useCallback(
    (changes: Partial<CameraZoneObj>) => {
      dispatch(
        mapEditorActions.updateMany(objs.map((o) => ({ id: o.id, changes }))),
      );
    },
    [dispatch, objs],
  );

  const zoomValues: PropertyValueInfo<number | undefined>[] = objs.map((o) => ({
    key: o.id,
    value: o.zoom,
    scope: "instance",
  }));

  const offsetValues: PropertyValueInfo<Vector2 | undefined>[] = objs.map(
    (o) => ({
      key: o.id,
      value: o.offset,
      scope: "instance",
    }),
  );

  const zoomInput = (
    <PropertyValue<number | undefined>
      label={t("cameraZonePropZoomLabel")}
      description={t("cameraZonePropZoomDescription")}
      noTemplate
      allowUndefined
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

  const range = 128;

  const offsetInput = (
    <Vector2Input
      label={t("cameraZonePropOffsetLabel")}
      description={t("cameraZonePropOffsetDescription")}
      values={offsetValues}
      allowUndefined={true}
      xRange={[-range, range]}
      yRange={[-range, range]}
      snapInterval={1}
      snapToZero={true}
      onValueChange={({
        value,
      }: {
        scope: PropertyValueScope;
        value: Vector2 | undefined;
      }) => {
        if (value !== undefined) updateObjs({ offset: value });
      }}
    />
  );

  return (
    <BaseZoneProperties
      objs={objs}
      legend={t("cameraZonePropLegend")}
      zoneType={MapObjType.CameraZone}
      updateObjs={updateObjs}
    >
      {zoomInput}
      {offsetInput}
    </BaseZoneProperties>
  );
}

export default memo(
  CameraZoneProperties,
  createPropsEqualFn<CameraZoneObj>(RELEVANT_PROPS),
);
