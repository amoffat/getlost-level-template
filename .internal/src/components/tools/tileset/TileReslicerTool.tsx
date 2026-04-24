import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { actions, selectors } from "@/slices/tilesetEditor";
import { Fieldset, Stack } from "@mantine/core";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import GridSizeInput from "../../GridSizeInput";
import Tip from "../../Tip";

export default function TileReslicerTool() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const grid = useAppSelector((state) => state.tilesetEditor.grid);
  const ts = useAppSelector(selectors.activeTileset);

  const changeGridSize = useCallback(
    async (size: number | string) => {
      if (typeof size === "string") return;
      dispatch(actions.setGridSize(size));
    },
    [dispatch],
  );

  if (!ts) return null;

  return (
    <>
      <Tip
        tips={[
          t('reslicerToolTipClickDrag'),
          t('reslicerToolTipGridSize'),
        ]}
      />
      <Fieldset legend={t('reslicerToolLegend')} p="xs">
        <Stack p={0}>
          {!ts.composite && (
            <GridSizeInput defaultValue={grid.size} onChange={changeGridSize} />
          )}
        </Stack>
      </Fieldset>
    </>
  );
}
