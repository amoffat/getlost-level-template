import { trackKeyPresses } from "@/editors/common/keypress";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { actions } from "@/slices/tilesetEditor";
import {
  Fieldset,
  Group,
  Kbd,
  SegmentedControl,
  Slider,
  Stack,
  Switch,
  Text,
} from "@mantine/core";
import {
  IconBrush,
  IconCircleFilled,
  IconEraser,
  IconSquareFilled,
} from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import AdvancedSection from "../../common/AdvancedSection";
import Tip from "../../Tip";

export default function ColliderTool() {
  const { t } = useTranslation();
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
  const [isControlPressed, setIsControlPressed] = useState(false);

  const objKey = useAppSelector((state) => {
    return state.tilesetEditor.selectedTiles.ids.join(",");
  });

  // Track keyboard state
  useEffect(() => {
    const clearEventHandlers = trackKeyPresses({
      element: document.body,
      handlers: {
        Control: (pressed: boolean) => {
          setIsControlPressed(pressed);
          const effectiveMode = pressed ? "erase" : "paint";
          dispatch(
            actions.setToolOptions({
              tool: "collider",
              options: { mode: effectiveMode },
            }),
          );
        },
        s: (pressed: boolean) => {
          if (pressed) {
            const newShape = brushShape === "square" ? "circle" : "square";
            dispatch(
              actions.setToolOptions({
                tool: "collider",
                options: { brushShape: newShape },
              }),
            );
          }
        },
      },
    });
    return clearEventHandlers;
  }, [dispatch, brushShape]);

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
          }),
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
        }),
      );
    },
    [dispatch],
  );

  const handleModeChange = useCallback(
    (value: string) => {
      dispatch(
        actions.setToolOptions({
          tool: "collider",
          options: { mode: value as "paint" | "erase" },
        }),
      );
    },
    [dispatch],
  );

  const handleBrushShapeChange = useCallback(
    (value: string) => {
      dispatch(
        actions.setToolOptions({
          tool: "collider",
          options: { brushShape: value as "square" | "circle" },
        }),
      );
    },
    [dispatch],
  );

  const handleDrawOnOpaqueOnlyChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      dispatch(
        actions.setToolOptions({
          tool: "collider",
          options: { drawOnOpaqueOnly: event.currentTarget.checked },
        }),
      );
    },
    [dispatch],
  );

  const handleOverlayOpacityChange = useCallback(
    (value: number | string) => {
      if (typeof value === "string") return;
      dispatch(
        actions.setToolOptions({
          tool: "collider",
          options: { overlayOpacity: value },
        }),
      );
    },
    [dispatch],
  );

  const handleShowCollidersChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      dispatch(
        actions.setToolOptions({
          tool: "collider",
          options: { showColliders: event.currentTarget.checked },
        }),
      );
    },
    [dispatch],
  );

  const handleSimplifyChange = useCallback(
    (value: number | string) => {
      if (typeof value === "string") return;

      dispatch(
        actions.setToolOptions({
          tool: "collider",
          options: { simplify: value, showColliders: true },
        }),
      );
    },
    [dispatch],
  );

  return (
    <>
      <Tip
        tips={[
          t('tsColliderTipDrawMasks'),
          t('tsColliderTipPaintErase'),
          <Trans i18nKey="tsColliderTipHoldCtrl">Hold <Kbd>Ctrl</Kbd> to temporarily switch to erase mode.</Trans>,
          <Trans i18nKey="tsColliderTipPressS">Press <Kbd>S</Kbd> to toggle brush shape.</Trans>,
          <Trans i18nKey="tsColliderTipScrollWheel">Hold <Kbd>Ctrl</Kbd> and scroll the mouse wheel to adjust brush size.</Trans>,
        ]}
      />
      <Fieldset legend={t('tsColliderLegend')} p="xs">
        <Stack p={0} gap="md">
          <Stack gap="xs" p={0}>
            <Text size="sm">{t('tsColliderBrushMode')}</Text>
            <SegmentedControl
              value={mode}
              onChange={handleModeChange}
              data={[
                {
                  label: (
                    <Group gap="xs" wrap="nowrap">
                      <IconBrush size={16} />
                      {t('tsColliderPaint')}
                    </Group>
                  ),
                  value: "paint",
                },
                {
                  label: (
                    <Group gap="xs" wrap="nowrap">
                      <IconEraser size={16} />
                      {t('tsColliderErase')}
                    </Group>
                  ),
                  value: "erase",
                },
              ]}
            />
          </Stack>

          <Stack gap="xs" p={0}>
            <Text size="sm">{t('tsColliderBrushShape')}</Text>
            <SegmentedControl
              value={brushShape}
              onChange={handleBrushShapeChange}
              data={[
                {
                  label: (
                    <Group gap="xs" wrap="nowrap">
                      <IconSquareFilled size={16} />
                      {t('tsColliderSquare')}
                    </Group>
                  ),
                  value: "square",
                },
                {
                  label: (
                    <Group gap="xs" wrap="nowrap">
                      <IconCircleFilled size={16} />
                      {t('tsColliderCircle')}
                    </Group>
                  ),
                  value: "circle",
                },
              ]}
            />
          </Stack>

          <Stack gap="xs" p={0} mb="md">
            <Text size="sm">{t('tsColliderBrushSize')}</Text>
            <Slider
              label={t('tsColliderBrushSize')}
              value={brushSize}
              onChange={handleBrushSizeChange}
              min={1}
              max={16}
              step={1}
              marks={[{ value: 1 }, { value: 16 }]}
            />
          </Stack>

          <AdvancedSection>
            <Stack gap="md" p={0}>
              <Switch
                label={t('tsColliderDrawOpaqueLabel')}
                description={t('tsColliderDrawOpaqueDesc')}
                checked={drawOnOpaqueOnly}
                onChange={handleDrawOnOpaqueOnlyChange}
              />

              <Stack gap="xs" p={0}>
                <Text size="sm">{t('tsColliderOverlayOpacity')}</Text>
                <Slider
                  label={t('tsColliderOverlayOpacity')}
                  value={overlayOpacity}
                  onChange={handleOverlayOpacityChange}
                  min={0}
                  max={1}
                  step={0.05}
                />
              </Stack>

              <Switch
                label={t('tsColliderShowColliders')}
                description={t('tsColliderShowCollidersDesc')}
                checked={showColliders}
                onChange={handleShowCollidersChange}
              />

              <Stack gap="xs" p={0}>
                <Text size="sm">{t('tsColliderSimplify')}</Text>
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
          </AdvancedSection>
        </Stack>
      </Fieldset>
    </>
  );
}
