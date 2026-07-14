import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { actions } from "@/slices/mapEditor";
import { selectors as tsSelectors } from "@/slices/tilesetEditor";
import { MapLayerName } from "@/types/layer";
import { isTileGroupTemplate, TileGroupTemplate } from "@/types/tilegroup";
import { PaintOpts } from "@/types/tools";
import {
  Alert,
  Fieldset,
  NumberInput,
  Radio,
  Stack,
  Tooltip,
} from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import Tip from "../../Tip";
import TileContext from "./TileContext";

export default function PaintTool() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const activeLayer = useAppSelector((state) => state.mapEditor.layers.active);
  const opts = useAppSelector((state) => state.mapEditor.toolOptions.paint);
  const placeObj = useAppSelector((state) => state.mapEditor.place.obj);

  const onChangeMode = useCallback(
    (value: string) => {
      const mode = value as PaintOpts["mode"];
      dispatch(
        actions.setToolOptions({
          tool: "paint",
          options: { mode },
        }),
      );
    },
    [dispatch],
  );

  const onChangeSnap = useCallback(
    (value: string) => {
      const snap = value as PaintOpts["snap"];
      dispatch(
        actions.setToolOptions({
          tool: "paint",
          options: { snap },
        }),
      );
    },
    [dispatch],
  );

  const onChangeSize = useCallback(
    (value: number | string) => {
      if (typeof value !== "number") return;
      dispatch(
        actions.setToolOptions({
          tool: "paint",
          options: { size: value },
        }),
      );
    },
    [dispatch],
  );

  const isGround = activeLayer === MapLayerName.Ground;

  // Determine if the placed tile is a grid-sized TileGroupTemplate from a
  // non-composite tileset – only then is tile context meaningful.
  const tileset = useAppSelector((state) =>
    placeObj && isTileGroupTemplate(placeObj)
      ? tsSelectors.selectTileset(
          state,
          state.tilesetEditor.objIdToTs[placeObj.id],
        )
      : null,
  );
  const contextTile: TileGroupTemplate | null =
    placeObj &&
    isTileGroupTemplate(placeObj) &&
    tileset &&
    !tileset.composite &&
    placeObj.pos.width === tileset.gridSize.x &&
    placeObj.pos.height === tileset.gridSize.y
      ? placeObj
      : null;

  return (
    <>
      <Tip tips={[t("paintToolTip1"), t("paintToolTip2")]} />
      <Stack p={0}>
        {!placeObj && (
          <Alert
            title={t("paintToolNoObjectTitle")}
            variant="light"
            icon={<IconInfoCircle />}
          >
            {t("paintToolNoObjectMsg")}
          </Alert>
        )}

        {contextTile && (
          <Fieldset legend={t("paintToolTileContextLegend")}>
            <TileContext placeObj={contextTile} />
          </Fieldset>
        )}

        {isGround && (
          <Fieldset legend={t("paintToolPlacementModeLegend")}>
            <Radio.Group
              name="paint-mode"
              value={opts.mode}
              onChange={onChangeMode}
            >
              <Stack p={0}>
                <Tooltip
                  label={t("paintToolPlaceOnceTooltip")}
                  refProp="rootRef"
                  position="left"
                  withArrow
                >
                  <Radio
                    value="place-once"
                    label={t("paintToolPlaceOnceLabel")}
                  />
                </Tooltip>
                <Tooltip
                  label={t("paintToolOverwriteTooltip")}
                  refProp="rootRef"
                  position="left"
                  withArrow
                >
                  <Radio
                    value="overwrite"
                    label={t("paintToolOverwriteLabel")}
                  />
                </Tooltip>
                <Tooltip
                  label={t("paintToolStackTooltip")}
                  refProp="rootRef"
                  position="left"
                  withArrow
                >
                  <Radio value="stack" label={t("paintToolStackLabel")} />
                </Tooltip>
                <NumberInput
                  label={t("paintToolBrushSizeLabel")}
                  value={opts.size}
                  min={1}
                  max={10}
                  step={1}
                  disabled
                  onChange={onChangeSize}
                />
              </Stack>
            </Radio.Group>
          </Fieldset>
        )}

        <Fieldset legend={t("paintToolSnappingLegend")} disabled>
          <Radio.Group name="snap" value={opts.snap} onChange={onChangeSnap}>
            <Stack p={0}>
              <Tooltip
                label={t("paintToolSnapGridTooltip")}
                refProp="rootRef"
                position="left"
                withArrow
              >
                <Radio value="grid" label={t("paintToolSnapGridLabel")} />
              </Tooltip>
              <Tooltip
                label={t("paintToolSnapObjectTooltip")}
                refProp="rootRef"
                position="left"
                withArrow
              >
                <Radio value="object" label={t("paintToolSnapObjectLabel")} />
              </Tooltip>
            </Stack>
          </Radio.Group>
        </Fieldset>
      </Stack>
    </>
  );
}
