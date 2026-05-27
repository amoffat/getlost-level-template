import { iconTsId, waypointIcon } from "@/constants/tsObjs";
import { useAppDispatch } from "@/hooks/redux";
import { actions as mapActions } from "@/slices/mapEditor";
import { loadTileGroup } from "@/utils/tileset";
import { ReactNode, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import Tip from "../../Tip";

export default function WaypointTool() {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const tips: ReactNode[] = useMemo(() => {
    return [t("waypointTip1"), t("waypointTip2")];
  }, [t]);

  useEffect(() => {
    const tg = loadTileGroup({
      id: waypointIcon,
      tilesetId: iconTsId,
    });
    dispatch(mapActions.setPlace(tg));
  }, [dispatch]);

  return (
    <>
      <Tip tips={tips} />
    </>
  );
}
