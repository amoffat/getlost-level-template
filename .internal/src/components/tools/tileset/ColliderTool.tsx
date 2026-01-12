import { trackKeyPresses } from "@/editors/common/keypress";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { actions } from "@/slices/tilesetEditor";
import {
  Button,
  Collapse,
  Fieldset,
  Group,
  Kbd,
  SegmentedControl,
  Slider,
  Stack,
  Switch,
  Text,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconBrush,
  IconCircleFilled,
  IconEraser,
  IconSquareFilled,
} from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";
import Tip from "../../Tip";

export default function ColliderTool() {
  const dispatch = useAppDispatch();
  const {
    brushSize,
    brushShape,
    mode,
    drawOnOpaqueOnly,
    overlayOpacity,
    showColliders,
    simplify,
  } = useAppSelector((state) => state.tilesetEditor.toolOptions.collider);
  const [advancedOpen, { toggle }] = useDisclosure(false);
  const [isControlPressed, setIsControlPressed] = useState(false);

  const objKey = useAppSelector((state) => {
    return state.tilesetEditor.selectedTiles.ids.join(",");
  });

  // Track keyboard state
  useEffect(() => {
    trackKeyPresses({
      element: document.body,
      handlers: {
        Control: (pressed: boolean) => {
          setIsControlPressed(pressed);
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

  // Handle scroll wheel for brush size adjustment when Control is pressed
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (isControlPressed) {
        e.preventDefault();

        const delta = e.deltaY > 0 ? -1 : 1;
        const newSize = Math.max(1, Math.min(16, brushSize + delta));
        dispatch(
          actions.setToolOptions({
            tool: "collider",
            options: { brushSize: newSize },
          })
        );
      }
    };

    document.body.addEventListener("wheel", handleWheel, { passive: false });
    return () => document.body.removeEventListener("wheel", handleWheel);
  }, [isControlPressed, brushSize, dispatch]);

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

  const handleBrushShapeChange = useCallback(
    (value: string) => {
      dispatch(
        actions.setToolOptions({
          tool: "collider",
          options: { brushShape: value as "square" | "circle" },
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
          <>
            Hold <Kbd>Ctrl</Kbd> to temporarily switch to erase mode.
          </>,
        ]}
      />
      <Fieldset legend="Collider" p="xs">
        <Stack p={0} gap="md">
          <SegmentedControl
            value={mode}
            onChange={handleModeChange}
            data={[
              {
                label: (
                  <Group gap="xs" wrap="nowrap">
                    <IconBrush size={16} />
                    Paint
                  </Group>
                ),
                value: "paint",
              },
              {
                label: (
                  <Group gap="xs" wrap="nowrap">
                    <IconEraser size={16} />
                    Erase
                  </Group>
                ),
                value: "erase",
              },
            ]}
          />

          <Stack gap="xs" p={0}>
            <Text size="sm">Brush Shape</Text>
            <SegmentedControl
              value={brushShape}
              onChange={handleBrushShapeChange}
              data={[
                {
                  label: (
                    <Group gap="xs" wrap="nowrap">
                      <IconSquareFilled size={16} />
                      Square
                    </Group>
                  ),
                  value: "square",
                },
                {
                  label: (
                    <Group gap="xs" wrap="nowrap">
                      <IconCircleFilled size={16} />
                      Circle
                    </Group>
                  ),
                  value: "circle",
                },
              ]}
            />
          </Stack>

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
