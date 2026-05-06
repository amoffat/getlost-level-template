import { globals as mapEditorGlobals } from "@/editors/map/globals";
import { globals as g } from "@/globals";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { actions as mapActions } from "@/slices/mapEditor";
import { RootState } from "@/store/store";
import { MapLayerName } from "@/types/layer";
import { BackgroundImageObj, isBackgroundImageObj } from "@/types/map";
import {
  ActionIcon,
  Alert,
  Box,
  Button,
  Fieldset,
  Group,
  Image,
  Slider,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconArrowBarToDown,
  IconArrowBarToUp,
  IconEye,
  IconEyeOff,
} from "@tabler/icons-react";
import { memo, ReactElement, useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import PropertyValue, { PropertyValueInfo } from "../PropertyValue";
import classes from "./BackgroundImageProperties.module.css";
import SwitchInput from "./inputs/SwitchInput";

interface BackgroundImagePropertiesProps {
  objs: BackgroundImageObj[];
}

function BackgroundImageProperties({ objs }: BackgroundImagePropertiesProps) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const [parallaxDisabledIds, setParallaxDisabledIds] = useState<Set<string>>(
    () => mapEditorGlobals.parallaxDisabledIds,
  );

  const allBackgroundObjs = useAppSelector((state: RootState) =>
    Object.values(state.mapEditor.objects.entities).filter(
      (o): o is BackgroundImageObj =>
        isBackgroundImageObj(o as BackgroundImageObj) &&
        (o as BackgroundImageObj).layer === MapLayerName.Background,
    ),
  );

  const isSingle = objs.length === 1;
  const singleObj = isSingle ? objs[0] : null;

  const updateProp = useCallback(
    <K extends keyof BackgroundImageObj>(
      key: K,
      getValue: (obj: BackgroundImageObj) => BackgroundImageObj[K],
    ) => {
      dispatch(
        mapActions.updateMany(
          objs.map((o) => ({
            id: o.id,
            changes: { [key]: getValue(o) } as Partial<BackgroundImageObj>,
          })),
        ),
      );
    },
    [dispatch, objs],
  );

  const handleParallaxToggle = useCallback((id: string) => {
    setParallaxDisabledIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      mapEditorGlobals.parallaxDisabledIds = next;
      return next;
    });
  }, []);

  const handleMoveUp = useCallback(() => {
    if (!singleObj) return;
    const sorted = [...allBackgroundObjs].sort((a, b) => a.z - b.z);
    const idx = sorted.findIndex((o) => o.id === singleObj.id);
    if (idx < sorted.length - 1) {
      const newOrder = [...sorted];
      [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
      dispatch(
        mapActions.updateMany(newOrder.map((o, i) => ({ id: o.id, changes: { z: i } }))),
      );
    }
  }, [dispatch, singleObj, allBackgroundObjs]);

  const handleMoveDown = useCallback(() => {
    if (!singleObj) return;
    const sorted = [...allBackgroundObjs].sort((a, b) => a.z - b.z);
    const idx = sorted.findIndex((o) => o.id === singleObj.id);
    if (idx > 0) {
      const newOrder = [...sorted];
      [newOrder[idx], newOrder[idx - 1]] = [newOrder[idx - 1], newOrder[idx]];
      dispatch(
        mapActions.updateMany(newOrder.map((o, i) => ({ id: o.id, changes: { z: i } }))),
      );
    }
  }, [dispatch, singleObj, allBackgroundObjs]);

  if (objs.length === 0) return null;

  const sortedBgObjs = [...allBackgroundObjs].sort((a, b) => a.z - b.z);
  const currentSortIndex = singleObj
    ? sortedBgObjs.findIndex((o) => o.id === singleObj.id)
    : -1;
  const isAtTop = !isSingle || currentSortIndex === sortedBgObjs.length - 1;
  const isAtBottom = !isSingle || currentSortIndex <= 0;

  const thumbnailSrc = singleObj
    ? g.backgroundImageObjectUrlCache.get(singleObj.imageId)
    : undefined;
  const parallaxEnabled = singleObj
    ? !parallaxDisabledIds.has(singleObj.id)
    : false;

  const parallaxXValues: PropertyValueInfo<number>[] = objs.map((o) => ({
    key: o.id,
    value: o.parallax.x,
    scope: "instance",
  }));

  const parallaxYValues: PropertyValueInfo<number>[] = objs.map((o) => ({
    key: o.id,
    value: o.parallax.y,
    scope: "instance",
  }));

  const tileXValues: PropertyValueInfo<boolean>[] = objs.map((o) => ({
    key: o.id,
    value: o.tileX ?? false,
    scope: "instance",
  }));

  const tileYValues: PropertyValueInfo<boolean>[] = objs.map((o) => ({
    key: o.id,
    value: o.tileY ?? false,
    scope: "instance",
  }));

  return (
    <Fieldset legend={t("bgImagePropLegend")} p="xs">
      <Stack p={0} gap="xl">
        {/* Image preview — single selection only */}
        {isSingle ? (
          <Box className={classes.thumbnailWrapper}>
            <Box className={classes.thumbnailCheckers} />
            <Image
              src={thumbnailSrc}
              w="100%"
              h={80}
              fit="cover"
              className={classes.thumbnailImage}
            />
          </Box>
        ) : (
          <Alert
            variant="light"
            color="blue"
            icon={<IconAlertTriangle size={16} />}
          >
            {t("bgImagePropMultipleSelected", { count: objs.length })}
          </Alert>
        )}

        {/* Parallax preview toggle — single selection only */}
        {isSingle && singleObj && (
          <Group gap="xs" justify="space-between">
            <Stack gap={0}>
              <Text size="sm">{t("bgImagePropParallaxPreviewLabel")}</Text>
              <Text size="xs" c="dimmed">
                {t("bgImagePropParallaxPreviewDesc")}
              </Text>
            </Stack>
            <Tooltip
              label={
                parallaxEnabled
                  ? t("bgImagePropDisableParallax")
                  : t("bgImagePropEnableParallax")
              }
              withArrow
              position="left"
            >
              <ActionIcon
                variant="subtle"
                color={parallaxEnabled ? "blue" : "gray"}
                onClick={() => handleParallaxToggle(singleObj.id)}
                aria-label={
                  parallaxEnabled
                    ? t("bgImagePropDisableParallax")
                    : t("bgImagePropEnableParallax")
                }
              >
                {parallaxEnabled ? (
                  <IconEye size={16} />
                ) : (
                  <IconEyeOff size={16} />
                )}
              </ActionIcon>
            </Tooltip>
          </Group>
        )}

        {/* Parallax X */}
        <PropertyValue
          label={t("bgImagePropParallaxXLabel")}
          description={t("bgImagePropParallaxXDesc")}
          noTemplate
          values={parallaxXValues}
          defaultValue={0}
          debounceMs={100}
          onValueChange={({ value }) => {
            if (value !== undefined)
              updateProp("parallax", (o) => ({ ...o.parallax, x: value }));
          }}
          renderInput={({
            key,
            defaultValue: value,
            onChange,
          }): ReactElement => (
            <Slider
              key={key}
              defaultValue={value}
              min={0}
              max={1}
              step={0.01}
              onChange={onChange}
            />
          )}
        />

        {/* Parallax Y */}
        <PropertyValue
          label={t("bgImagePropParallaxYLabel")}
          description={t("bgImagePropParallaxYDesc")}
          noTemplate
          values={parallaxYValues}
          defaultValue={0}
          debounceMs={100}
          onValueChange={({ value }) => {
            if (value !== undefined)
              updateProp("parallax", (o) => ({ ...o.parallax, y: value }));
          }}
          renderInput={({
            key,
            defaultValue: value,
            onChange,
          }): ReactElement => (
            <Slider
              key={key}
              defaultValue={value}
              min={0}
              max={1}
              step={0.01}
              onChange={onChange}
            />
          )}
        />

        {/* Tile X */}
        <SwitchInput
          noTemplate
          label={t("bgImagePropTileXLabel")}
          description={t("bgImagePropTileXDesc")}
          values={tileXValues}
          onValueChange={({ value }) => {
            if (value !== undefined) updateProp("tileX", () => value);
          }}
        />

        {/* Tile Y */}
        <SwitchInput
          noTemplate
          label={t("bgImagePropTileYLabel")}
          description={t("bgImagePropTileYDesc")}
          values={tileYValues}
          onValueChange={({ value }) => {
            if (value !== undefined) updateProp("tileY", () => value);
          }}
        />

        {/* Z-ordering — single selection only */}
        <Stack gap="xs" p={0}>
          <Button
            fullWidth
            variant="light"
            size="xs"
            leftSection={<IconArrowBarToUp size={14} />}
            onClick={handleMoveUp}
            disabled={isAtTop}
          >
            {t("bgImagePropMoveUp")}
          </Button>
          <Button
            fullWidth
            variant="light"
            size="xs"
            leftSection={<IconArrowBarToDown size={14} />}
            onClick={handleMoveDown}
            disabled={isAtBottom}
          >
            {t("bgImagePropMoveDown")}
          </Button>
        </Stack>
      </Stack>
    </Fieldset>
  );
}

export default memo(BackgroundImageProperties);
