import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { actions } from "@/slices/mapEditor";
import { ColliderOpts } from "@/types/tools";
import { Fieldset, Kbd, Radio, Stack } from "@mantine/core";
import { useCallback } from "react";
import { Trans, useTranslation } from "react-i18next";
import Tip from "../../Tip";

export default function ColliderTool() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const opts = useAppSelector(
    (state) => state.mapEditor.toolOptions["add-collider"]
  );

  const onChangeMode = useCallback(
    (value: string) => {
      const type = value as ColliderOpts["type"];
      dispatch(
        actions.setToolOptions({
          tool: "add-collider",
          options: { type },
        })
      );
    },
    [dispatch]
  );

  return (
    <>
      <Tip
        tips={[
          t("mapColliderTip1"),
          <Trans i18nKey="mapColliderTip2">
            Hold <Kbd>Ctrl</Kbd> to snap the collider to the grid.
          </Trans>,
          t("mapColliderTip3"),
        ]}
      />
      <Fieldset legend={t("mapColliderOptionsLegend")} p="xs">
        <Radio.Group
          name="collider-mode"
          value={opts.type}
          onChange={onChangeMode}
        >
          <Stack>
            <Radio value="box" label={t("mapColliderBoxLabel")} />
            <Radio value="ellipse" label={t("mapColliderCircleLabel")} />
          </Stack>
        </Radio.Group>
      </Fieldset>
    </>
  );
}
