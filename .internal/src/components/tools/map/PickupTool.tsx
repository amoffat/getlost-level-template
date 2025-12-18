import { iconTsId, pickupIcon } from "@/constants/tsObjs";
import { useAppDispatch } from "@/hooks/redux";
import { actions as mapActions } from "@/slices/mapEditor";
import { loadTileGroup } from "@/utils/tileset";
import { ReactNode, useEffect, useMemo } from "react";
import Tip from "../../Tip";

export default function PickupTool() {
  const dispatch = useAppDispatch();

  const tips: ReactNode[] = useMemo(() => {
    return [
      "Pickups are items that the player can collect and use in levels.",
      "Click on the map to place a pickup.",
    ];
  }, []);

  useEffect(() => {
    const tg = loadTileGroup({
      id: pickupIcon,
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
