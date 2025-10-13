import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { actions } from "@/slices/mapEditor";
import { MapLayerName } from "@/types/layer";
import { PaintOpts } from "@/types/tools";
import { Fieldset, Radio, Stack, Tooltip } from "@mantine/core";
import { useCallback } from "react";

export default function Paint() {
  const dispatch = useAppDispatch();

  const activeLayer = useAppSelector((state) => state.mapEditor.layers.active);
  const opts = useAppSelector((state) => state.mapEditor.toolOptions.paint);

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

  const isGround = activeLayer !== MapLayerName.Ground;

  return (
    <Stack p={0}>
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
              {/* <NumberInput
            label="Brush size"
            value={opts.size}
            min={1}
            max={10}
            step={1}
            onChange={onChangeSize}
          /> */}
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
  );
}
