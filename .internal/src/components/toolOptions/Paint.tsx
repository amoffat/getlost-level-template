import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { actions } from "@/slices/mapEditor";
import { setActiveLayerThunk } from "@/thunks/map";
import { MapLayerName } from "@/types/layer";
import { isTileGroupTemplate } from "@/types/tilegroup";
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
import { useCallback, useEffect } from "react";
import Tip from "../Tip";

export default function Paint() {
  const dispatch = useAppDispatch();

  const activeLayer = useAppSelector((state) => state.mapEditor.layers.active);
  const opts = useAppSelector((state) => state.mapEditor.toolOptions.paint);
  const placeObj = useAppSelector((state) => state.mapEditor.place.obj);

  useEffect(() => {
    if (placeObj) {
      let switchTo = MapLayerName.Exterior;
      if (isTileGroupTemplate(placeObj)) {
        const isSolidTile = placeObj.coverage === 1.0;
        switchTo = isSolidTile ? MapLayerName.Ground : MapLayerName.Exterior;
      }

      dispatch(setActiveLayerThunk({ layer: switchTo, notify: true }));
    }
  }, [dispatch, placeObj]);

  const onChangeMode = useCallback(
    (value: string) => {
      const mode = value as PaintOpts["mode"];
      dispatch(
        actions.setToolOptions({
          tool: "paint",
          options: { mode },
        })
      );
    },
    [dispatch]
  );

  const onChangeSnap = useCallback(
    (value: string) => {
      const snap = value as PaintOpts["snap"];
      dispatch(
        actions.setToolOptions({
          tool: "paint",
          options: { snap },
        })
      );
    },
    [dispatch]
  );

  const onChangeSize = useCallback(
    (value: number | string) => {
      if (typeof value !== "number") return;
      dispatch(
        actions.setToolOptions({
          tool: "paint",
          options: { size: value },
        })
      );
    },
    [dispatch]
  );

  const isGround = activeLayer === MapLayerName.Ground;

  return (
    <>
      <Tip
        tips={[
          "The paint tool allows you to place tiles or objects on the map.",
          "Paint tiles on the ground layer and objects on the world layer.",
        ]}
      />
      <Stack p={0}>
        {!placeObj && (
          <Alert
            title="No object selected"
            variant="light"
            icon={<IconInfoCircle />}
          >
            Please select an object from the palette.
          </Alert>
        )}

        {isGround && (
          <Fieldset legend="Placement mode">
            <Radio.Group
              name="paint-mode"
              value={opts.mode}
              onChange={onChangeMode}
            >
              <Stack p={0}>
                <Tooltip
                  label="Places only on empty spaces"
                  refProp="rootRef"
                  position="left"
                  withArrow
                >
                  <Radio value="place-once" label="Place once" />
                </Tooltip>
                <Tooltip
                  label="Replaces existing tiles"
                  refProp="rootRef"
                  position="left"
                  withArrow
                >
                  <Radio value="overwrite" label="Overwrite" />
                </Tooltip>
                <Tooltip
                  label="Stack on top of existing tiles"
                  refProp="rootRef"
                  position="left"
                  withArrow
                >
                  <Radio value="stack" label="Stack" />
                </Tooltip>
                <NumberInput
                  label="Brush size"
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

        <Fieldset legend="Snapping" disabled>
          <Radio.Group name="snap" value={opts.snap} onChange={onChangeSnap}>
            <Stack p={0}>
              <Tooltip
                label="Use the map's grid for snapping"
                refProp="rootRef"
                position="left"
                withArrow
              >
                <Radio value="grid" label="Snap to grid" />
              </Tooltip>
              <Tooltip
                label="Use the object's size for snapping"
                refProp="rootRef"
                position="left"
                withArrow
              >
                <Radio value="object" label="Snap to object's size" />
              </Tooltip>
            </Stack>
          </Radio.Group>
        </Fieldset>
      </Stack>
    </>
  );
}
