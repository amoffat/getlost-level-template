import { entranceIcon, exitIcon, iconTsId } from "@/constants/tsObjs";
import { useAppDispatch } from "@/hooks/redux";
import { actions as mapActions } from "@/slices/mapEditor";
import { loadTileGroup } from "@/utils/tileset";
import { Fieldset, Radio, Stack, Tooltip } from "@mantine/core";
import { ReactNode, useCallback, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import Tip from "../../Tip";

export default function GatewayTool() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const tips: ReactNode[] = useMemo(() => {
    return [
      t("gatewayTip1"),
      t("gatewayTip2"),
      t("gatewayTip3"),
    ];
  }, [t]);

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
      <Fieldset legend={t("gatewayTypeLegend")} p="xs">
        <Radio.Group
          name="gateway-type"
          onChange={onSetGatewayType}
          defaultValue="entrance"
        >
          <Stack>
            <Tooltip
              label={t("gatewayEntranceTooltip")}
              refProp="rootRef"
              position="left"
              withArrow
            >
              <Radio value="entrance" label={t("gatewayEntranceLabel")} />
            </Tooltip>
            <Tooltip
              label={t("gatewayExitTooltip")}
              refProp="rootRef"
              position="left"
              withArrow
            >
              <Radio value="exit" label={t("gatewayExitLabel")} />
            </Tooltip>
          </Stack>
        </Radio.Group>
      </Fieldset>
    </>
  );
}
