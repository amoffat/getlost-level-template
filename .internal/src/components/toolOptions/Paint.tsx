import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { actions, selectors } from "@/slices/mapEditor";
import { PaintOpts } from "@/types/tools";
import { Radio, Stack, Tooltip } from "@mantine/core";
import { useCallback } from "react";

export default function Paint() {
  const dispatch = useAppDispatch();

  const activeLayer = useAppSelector((state) => state.mapEditor.layers.active);
  const toolOptions = useAppSelector(selectors.selectToolOptions);
  const mode = toolOptions?.mode;

  const onChange = useCallback(
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

  if (activeLayer !== "ground") return null;

  return (
    <Stack p={0}>
      <Radio.Group name="paint-mode" value={mode} onChange={onChange}>
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
        </Stack>
      </Radio.Group>
    </Stack>
  );
}
