import { useAppDispatch } from "@/hooks/redux";
import { actions as mapEditorActions } from "@/slices/mapEditor";
import { CollisionObj, MapObjType } from "@/types/map";
import { createPropsEqualFn } from "@/utils/propertyKey";
import { memo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import BaseZoneProperties from "./BaseZoneProperties";

const RELEVANT_PROPS = ["id"] as const;

function CollisionZoneProperties({ objs }: { objs: CollisionObj[] }) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const updateObjs = useCallback(
    (changes: Partial<CollisionObj>) => {
      dispatch(
        mapEditorActions.updateMany(objs.map((o) => ({ id: o.id, changes }))),
      );
    },
    [dispatch, objs],
  );

  return (
    <BaseZoneProperties
      objs={objs}
      legend={t("collisionZonePropLegend")}
      zoneType={MapObjType.CollisionZone}
      updateObjs={updateObjs}
    />
  );
}

export default memo(
  CollisionZoneProperties,
  createPropsEqualFn<CollisionObj>(RELEVANT_PROPS),
);
