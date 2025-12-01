import { entranceIcon, exitIcon, iconTsId } from "@/constants/tsObjs";
import { useAppDispatch } from "@/hooks/redux";
import { actions as mapActions } from "@/slices/mapEditor";
import { loadTileGroup } from "@/utils/tileset";
import { Fieldset, Radio, Stack, Tooltip } from "@mantine/core";
import { ReactNode, useCallback, useEffect, useMemo } from "react";
import Tip from "../../Tip";

export default function GatewayTool() {
  const dispatch = useAppDispatch();

  const tips: ReactNode[] = useMemo(() => {
    return [
      "Click on a gateway to select it.",
      "Click on the map to place the gateway.",
      "Gateways can only be placed on the Special layer.",
    ];
  }, []);

  const onSetGatewayType = useCallback(
    (value: string) => {
      const type = value as "entrance" | "exit";
      let icon = exitIcon;
      if (type === "entrance") {
        icon = entranceIcon;
      }
      const tg = loadTileGroup({
        id: icon,
        tilesetId: iconTsId,
      });
      dispatch(mapActions.setPlace(tg));
    },
    [dispatch]
  );

  useEffect(() => {
    onSetGatewayType("entrance");
  }, [onSetGatewayType]);

  return (
    <>
      <Tip tips={tips} />
      <Fieldset legend="Gateway type" p="xs">
        <Radio.Group
          name="gateway-type"
          onChange={onSetGatewayType}
          defaultValue="entrance"
        >
          <Stack>
            <Tooltip
              label="Where the player enters the level"
              refProp="rootRef"
              position="left"
              withArrow
            >
              <Radio value="entrance" label="Entrance" />
            </Tooltip>
            <Tooltip
              label="Where the player exits the level"
              refProp="rootRef"
              position="left"
              withArrow
            >
              <Radio value="exit" label="Exit" />
            </Tooltip>
          </Stack>
        </Radio.Group>
      </Fieldset>
    </>
  );
}
