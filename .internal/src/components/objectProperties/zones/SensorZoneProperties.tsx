import { useAppDispatch } from "@/hooks/redux";
import { actions as mapEditorActions } from "@/slices/mapEditor";
import { MapObjType, SensorZoneObj } from "@/types/map";
import { createPropsEqualFn } from "@/utils/propertyKey";
import { memo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import BaseZoneProperties from "./BaseZoneProperties";

const RELEVANT_PROPS = ["id", "name"] as const;

function SensorZoneProperties({ objs }: { objs: SensorZoneObj[] }) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const updateObjs = useCallback(
    (changes: Partial<SensorZoneObj>) => {
      dispatch(
        mapEditorActions.updateMany(objs.map((o) => ({ id: o.id, changes }))),
      );
    },
    [dispatch, objs],
  );

  return (
    <BaseZoneProperties
      objs={objs}
      legend={t("sensorZonePropLegend")}
      zoneType={MapObjType.SensorZone}
      updateObjs={updateObjs}
    />
  );
}

export default memo(
  SensorZoneProperties,
  createPropsEqualFn<SensorZoneObj>(RELEVANT_PROPS),
);
