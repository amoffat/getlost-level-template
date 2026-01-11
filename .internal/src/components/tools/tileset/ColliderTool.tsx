import { trackKeyPresses } from "@/editors/common/keypress";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { actions } from "@/slices/tilesetEditor";
import {
  Button,
  Collapse,
  Fieldset,
  SegmentedControl,
  Slider,
  Stack,
  Switch,
  Text,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useCallback, useEffect } from "react";
import Tip from "../../Tip";

export default function ColliderTool() {
  const dispatch = useAppDispatch();
  const {
    brushSize,
    mode,
    drawOnOpaqueOnly,
    overlayOpacity,
    showColliders,
    simplify,
  } = useAppSelector((state) => state.tilesetEditor.toolOptions.collider);
  const [advancedOpen, { toggle }] = useDisclosure(false);

  const objKey = useAppSelector((state) => {
    return state.tilesetEditor.selectedTiles.ids.join(",");
  });

  // Track keyboard state
  useEffect(() => {
    trackKeyPresses({
      element: document.body,
      handlers: {
        Control: (pressed: boolean) => {
          const effectiveMode = pressed ? "erase" : "paint";
          dispatch(
            actions.setToolOptions({
              tool: "collider",
              options: { mode: effectiveMode },
            })
          );
        },
      },
    });
  }, [dispatch]);

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

  const handleOverlayOpacityChange = useCallback(
    (value: number | string) => {
      if (typeof value === "string") return;
      dispatch(
        actions.setToolOptions({
          tool: "collider",
          options: { overlayOpacity: value },
        })
      );
    },
    [dispatch]
  );

  const handleShowCollidersChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      dispatch(
        actions.setToolOptions({
          tool: "collider",
          options: { showColliders: event.currentTarget.checked },
        })
      );
    },
    [dispatch]
  );

  const handleSimplifyChange = useCallback(
    (value: number | string) => {
      if (typeof value === "string") return;

      dispatch(
        actions.setToolOptions({
          tool: "collider",
          options: { simplify: value, showColliders: true },
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

          <Stack gap="xs" p={0} mb="md">
            <Text size="sm">Brush Size</Text>
            <Slider
              label="Brush Size"
              value={brushSize}
              onChange={handleBrushSizeChange}
              min={1}
              max={16}
              step={1}
              marks={[{ value: 1 }, { value: 16 }]}
            />
          </Stack>

          <Button variant="subtle" size="xs" onClick={toggle} fullWidth>
            {advancedOpen ? "Hide" : "Show"} Advanced
          </Button>

          <Collapse in={advancedOpen}>
            <Stack gap="md" p={0}>
              <Switch
                label="Draw on opaque pixels only"
                description="When enabled, brush only draws on non-transparent pixels"
                checked={drawOnOpaqueOnly}
                onChange={handleDrawOnOpaqueOnlyChange}
              />

              <Stack gap="xs" p={0}>
                <Text size="sm">Overlay Opacity</Text>
                <Slider
                  label="Overlay Opacity"
                  value={overlayOpacity}
                  onChange={handleOverlayOpacityChange}
                  min={0}
                  max={1}
                  step={0.05}
                />
              </Stack>

              <Switch
                label="Show colliders"
                description="Display computed collision rectangles as overlays"
                checked={showColliders}
                onChange={handleShowCollidersChange}
              />

              <Stack gap="xs" p={0}>
                <Text size="sm">Simplify collider</Text>
                <Slider
                  key={objKey}
                  label={simplify.toFixed(3)}
                  defaultValue={simplify}
                  onChangeEnd={handleSimplifyChange}
                  min={0}
                  max={2.5}
                  step={0.001}
                />
              </Stack>
            </Stack>
          </Collapse>
        </Stack>
      </Fieldset>
    </>
  );
}
