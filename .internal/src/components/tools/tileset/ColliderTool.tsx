import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { actions } from "@/slices/tilesetEditor";
import {
  Fieldset,
  NumberInput,
  SegmentedControl,
  Stack,
  Switch,
} from "@mantine/core";
import { useCallback } from "react";
import Tip from "../../Tip";

export default function ColliderTool() {
  const dispatch = useAppDispatch();
  const { brushSize, mode, drawOnOpaqueOnly } = useAppSelector(
    (state) => state.tilesetEditor.toolOptions.collider
  );

  const handleBrushSizeChange = useCallback(
    (value: number | string) => {
      if (typeof value === "string") return;
      dispatch(
        actions.setToolOptions({
          tool: "collider",
          options: { brushSize: value },
        })
      );
    },
    [dispatch]
  );

  const handleModeChange = useCallback(
    (value: string) => {
      dispatch(
        actions.setToolOptions({
          tool: "collider",
          options: { mode: value as "paint" | "erase" },
        })
      );
    },
    [dispatch]
  );

  const handleDrawOnOpaqueOnlyChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      dispatch(
        actions.setToolOptions({
          tool: "collider",
          options: { drawOnOpaqueOnly: event.currentTarget.checked },
        })
      );
    },
    [dispatch]
  );

  return (
    <>
      <Tip
        tips={[
          "Draw collision masks on tile groups by painting directly on the tileset.",
          "Paint mode adds collision areas, erase mode removes them.",
          "Adjust brush size to paint larger or smaller areas.",
        ]}
      />
      <Fieldset legend="Collider" p="xs">
        <Stack p={0} gap="md">
          <SegmentedControl
            value={mode}
            onChange={handleModeChange}
            data={[
              { label: "Paint", value: "paint" },
              { label: "Erase", value: "erase" },
            ]}
          />

          <NumberInput
            label="Brush Size"
            description="Size of the brush in pixels"
            value={brushSize}
            onChange={handleBrushSizeChange}
            min={1}
            max={50}
            step={1}
          />

          <Switch
            label="Draw on opaque pixels only"
            description="When enabled, brush only draws on non-transparent pixels"
            checked={drawOnOpaqueOnly}
            onChange={handleDrawOnOpaqueOnlyChange}
          />
        </Stack>
      </Fieldset>
    </>
  );
}
