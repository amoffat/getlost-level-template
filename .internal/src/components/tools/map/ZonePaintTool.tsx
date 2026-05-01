import { ZONE_TYPE_META } from "@/constants/zoneMeta";
import { trackKeyPresses } from "@/editors/common/keypress";
import { getZonePaintTool } from "@/editors/map/tools/zone";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { actions, selectors } from "@/slices/mapEditor";
import { isZoneObj } from "@/types/map";
import { BrushShape, PaintMode, ZoneType, zoneTypes } from "@/types/zone";
import {
  Badge,
  Button,
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
  IconTrash,
} from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import AdvancedSection from "../../common/AdvancedSection";
import Tip from "../../Tip";

export default function ZonePaintTool() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const {
    brushSize,
    brushShape,
    mode,
    overlayOpacity,
    showColliders,
    simplify,
    zoneType,
  } = useAppSelector((state) => state.mapEditor.toolOptions["paint-zone"]);

  // Determine if a zone object is selected (locking zone type)
  const selectedObjs = useAppSelector((state) => selectors.selectedObjs(state));
  const selectedZone = useMemo(
    () => selectedObjs.find((o) => isZoneObj(o)) ?? null,
    [selectedObjs],
  );
  const isTypeLocked = selectedZone !== null;

  const [isControlPressed, setIsControlPressed] = useState(false);

  useEffect(() => {
    const clearEventHandlers = trackKeyPresses({
      element: document.body,
      handlers: {
        Control: (pressed: boolean) => {
          setIsControlPressed(pressed);
          const effectiveMode = pressed ? "erase" : "paint";
          dispatch(
            actions.setToolOptions({
              tool: "paint-zone",
              options: { mode: effectiveMode },
            }),
          );
        },
        s: (pressed: boolean) => {
          if (pressed) {
            const newShape = brushShape === "square" ? "circle" : "square";
            dispatch(
              actions.setToolOptions({
                tool: "paint-zone",
                options: { brushShape: newShape },
              }),
            );
          }
        },
      },
    });
    return clearEventHandlers;
  }, [dispatch, brushShape]);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (isControlPressed) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -1 : 1;
        const newSize = Math.max(1, Math.min(16, brushSize + delta));
        dispatch(
          actions.setToolOptions({
            tool: "paint-zone",
            options: { brushSize: newSize },
          }),
        );
      }
    };
    document.body.addEventListener("wheel", handleWheel, { passive: false });
    return () => document.body.removeEventListener("wheel", handleWheel);
  }, [isControlPressed, brushSize, dispatch]);

  const handleZoneTypeChange = useCallback(
    (value: ZoneType) => {
      if (isTypeLocked) return;
      dispatch(
        actions.setToolOptions({
          tool: "paint-zone",
          options: { zoneType: value },
        }),
      );
    },
    [dispatch, isTypeLocked],
  );

  const handleBrushSizeChange = useCallback(
    (value: number | string) => {
      if (typeof value === "string") return;
      dispatch(
        actions.setToolOptions({
          tool: "paint-zone",
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
          tool: "paint-zone",
          options: { mode: value as PaintMode },
        }),
      );
    },
    [dispatch],
  );

  const handleBrushShapeChange = useCallback(
    (value: string) => {
      dispatch(
        actions.setToolOptions({
          tool: "paint-zone",
          options: { brushShape: value as BrushShape },
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
          tool: "paint-zone",
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
          tool: "paint-zone",
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
          tool: "paint-zone",
          options: { simplify: value, showColliders: true },
        }),
      );
    },
    [dispatch],
  );

  const handleClear = useCallback(() => {
    getZonePaintTool().clearMask();
  }, []);

  // The effective zone type: locked to selected object, or chosen by user
  const effectiveZoneType = isTypeLocked
    ? (getZonePaintTool().lockedZoneType ?? zoneType)
    : zoneType;

  const meta = ZONE_TYPE_META[effectiveZoneType];

  return (
    <>
      <Tip
        tips={[
          t("mapZoneTipDraw"),
          t("mapZoneTipPaintErase"),
          <Trans i18nKey="mapZoneTipHoldCtrl">
            Hold <Kbd>Ctrl</Kbd> to temporarily switch to erase mode.
          </Trans>,
          <Trans i18nKey="mapZoneTipPressS">
            Press <Kbd>S</Kbd> to toggle brush shape.
          </Trans>,
          <Trans i18nKey="mapZoneTipScrollWheel">
            Hold <Kbd>Ctrl</Kbd> and scroll the mouse wheel to adjust brush
            size.
          </Trans>,
          t("mapZoneTipSelectZone"),
        ]}
      />
      <Fieldset legend={t("mapZoneLegend")} p="xs">
        <Stack p={0} gap="md">
          {/* Zone type selector — locked when an object is selected */}
          <Stack gap="xs" p={0}>
            <Text size="sm">{t("mapZoneType")}</Text>
            {isTypeLocked ? (
              <Badge
                color={meta.cssColor}
                leftSection={meta.icon}
                variant="light"
                size="md"
                radius="sm"
              >
                {t(meta.label)}
              </Badge>
            ) : (
              <SegmentedControl
                value={effectiveZoneType}
                onChange={handleZoneTypeChange}
                orientation="vertical"
                data={zoneTypes.map((opt) => {
                  const meta = ZONE_TYPE_META[opt];
                  return {
                    value: opt,
                    label: (
                      <Group gap="xs" wrap="nowrap">
                        {meta.icon}
                        {t(meta.label)}
                      </Group>
                    ),
                  };
                })}
              />
            )}
          </Stack>

          <Stack gap="xs" p={0}>
            <Text size="sm">{t("tsColliderBrushMode")}</Text>
            <SegmentedControl
              value={mode}
              onChange={handleModeChange}
              data={[
                {
                  label: (
                    <Group gap="xs" wrap="nowrap">
                      <IconBrush size={16} />
                      {t("tsColliderPaint")}
                    </Group>
                  ),
                  value: "paint",
                },
                {
                  label: (
                    <Group gap="xs" wrap="nowrap">
                      <IconEraser size={16} />
                      {t("tsColliderErase")}
                    </Group>
                  ),
                  value: "erase",
                },
              ]}
            />
          </Stack>

          <Stack gap="xs" p={0}>
            <Text size="sm">{t("tsColliderBrushShape")}</Text>
            <SegmentedControl
              value={brushShape}
              onChange={handleBrushShapeChange}
              data={[
                {
                  label: (
                    <Group gap="xs" wrap="nowrap">
                      <IconSquareFilled size={16} />
                      {t("tsColliderSquare")}
                    </Group>
                  ),
                  value: "square",
                },
                {
                  label: (
                    <Group gap="xs" wrap="nowrap">
                      <IconCircleFilled size={16} />
                      {t("tsColliderCircle")}
                    </Group>
                  ),
                  value: "circle",
                },
              ]}
            />
          </Stack>

          <Stack gap="xs" p={0} mb="md">
            <Text size="sm">{t("tsColliderBrushSize")}</Text>
            <Slider
              label={t("tsColliderBrushSize")}
              value={brushSize}
              onChange={handleBrushSizeChange}
              min={1}
              max={16}
              step={1}
              marks={[{ value: 1 }, { value: 16 }]}
            />
          </Stack>

          <Button
            leftSection={<IconTrash size={16} />}
            variant="light"
            color="red"
            size="xs"
            onClick={handleClear}
          >
            {t("mapZoneClear")}
          </Button>

          <AdvancedSection>
            <Stack gap="md" p={0}>
              <Stack gap="xs" p={0}>
                <Text size="sm">{t("tsColliderOverlayOpacity")}</Text>
                <Slider
                  label={t("tsColliderOverlayOpacity")}
                  value={overlayOpacity}
                  onChange={handleOverlayOpacityChange}
                  min={0}
                  max={1}
                  step={0.05}
                />
              </Stack>

              <Switch
                label={t("tsColliderShowColliders")}
                description={t("mapZoneShowOverlayDesc")}
                checked={showColliders}
                onChange={handleShowCollidersChange}
              />

              <Stack gap="xs" p={0}>
                <Text size="sm">{t("tsColliderSimplify")}</Text>
                <Slider
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
