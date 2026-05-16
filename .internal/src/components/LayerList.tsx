import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { actions } from "@/slices/mapEditor";
import { RootState } from "@/store/store";
import { setActiveLayerThunk } from "@/thunks/map";
import { MapLayerName } from "@/types/layer";
import { mapLayerToName } from "@/utils/layer";
import {
  ActionIcon,
  Fieldset,
  Group,
  Overlay,
  Radio,
  Stack,
  Text,
} from "@mantine/core";
import { IconEye, IconEyeOff } from "@tabler/icons-react";
import { MouseEvent, useCallback, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import classes from "./styles/LayerList.module.css";

interface Layer {
  id: number;
  description: string;
}

interface LayerListProps {
  layerConstraints?: MapLayerName[];
}

export default function LayerList({ layerConstraints }: LayerListProps) {
  const { t } = useTranslation();
  const layerState = useAppSelector(
    (state: RootState) => state.mapEditor.layers,
  );
  const activeLayer = useAppSelector(
    (state: RootState) => state.mapEditor.layers.active,
  );
  const hiddenLayers = useAppSelector(
    (state: RootState) => state.mapEditor.layers.hiddenLayers,
  );
  const dispatch = useAppDispatch();

  const HIDDEN_LAYERS_KEY = "layerList:hiddenLayers";

  // Restore hidden layers from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(HIDDEN_LAYERS_KEY);
      if (stored) {
        const parsed: MapLayerName[] = JSON.parse(stored);
        for (const layer of parsed) {
          dispatch(actions.setLayerHidden({ layer, hidden: true }));
        }
      }
    } catch {
      // ignore malformed data
    }
  }, [dispatch]);

  // Persist hidden layers to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(HIDDEN_LAYERS_KEY, JSON.stringify(hiddenLayers));
  }, [hiddenLayers]);

  const changeActiveLayer = useCallback(
    (id: number) => {
      dispatch(setActiveLayerThunk({ layer: id as MapLayerName }));
    },
    [dispatch],
  );

  const toggleLayerVisibility = useCallback(
    (e: MouseEvent<HTMLElement>, layerId: MapLayerName) => {
      e.stopPropagation();
      const isHidden = hiddenLayers.includes(layerId);
      dispatch(actions.setLayerHidden({ layer: layerId, hidden: !isHidden }));
    },
    [dispatch, hiddenLayers],
  );

  const layers: Layer[] = useMemo(() => {
    return [
      {
        id: MapLayerName.Exterior,
        description: t("layerListExteriorDescription"),
      },
      {
        id: MapLayerName.Ground,
        description: t("layerListGroundDescription"),
      },

      {
        id: MapLayerName.Zones,
        description: t("layerListSensorsDescription"),
      },

      {
        id: MapLayerName.Special,
        description: t("layerListSpecialDescription"),
      },
      {
        id: MapLayerName.Background,
        description: t("layerListBackgroundDescription"),
      },
    ];
  }, [t]);

  return (
    <Fieldset legend={t("layerListLegend")} p="xs">
      <Stack p={0}>
        <Radio.Group
          value={layerState.active.toString()}
          onChange={(value) => changeActiveLayer(Number(value))}
        >
          <Stack p={0} gap="xs">
            {layers.map((layer) => {
              const isDisabled =
                layerConstraints !== undefined &&
                layerConstraints.length > 0 &&
                !layerConstraints.includes(layer.id);
              const isVisible = !hiddenLayers.includes(
                layer.id as MapLayerName,
              );
              return (
                <Radio.Card
                  className={classes.root}
                  radius="md"
                  value={layer.id.toString()}
                  key={layer.id}
                  disabled={isDisabled}
                  style={{ position: "relative" }}
                >
                  {isDisabled && (
                    <Overlay backgroundOpacity={0.2} radius="md" />
                  )}
                  <Group
                    wrap="nowrap"
                    align="flex-start"
                    justify="space-between"
                  >
                    <Group wrap="nowrap" align="flex-start">
                      <Radio.Indicator />
                      <div>
                        <Text className={classes.label}>
                          {mapLayerToName(layer.id)}
                        </Text>
                        {activeLayer === layer.id && (
                          <Text className={classes.description}>
                            {layer.description}
                          </Text>
                        )}
                      </div>
                    </Group>
                    <ActionIcon
                      component="span"
                      variant="subtle"
                      color="gray"
                      size="sm"
                      role="button"
                      tabIndex={isDisabled ? -1 : 0}
                      aria-label={t("layerListToggleVisibility")}
                      aria-pressed={!isVisible}
                      onClick={(e) =>
                        toggleLayerVisibility(e, layer.id as MapLayerName)
                      }
                    >
                      {isVisible ? (
                        <IconEye size={14} />
                      ) : (
                        <IconEyeOff size={14} />
                      )}
                    </ActionIcon>
                  </Group>
                </Radio.Card>
              );
            })}
          </Stack>
        </Radio.Group>
      </Stack>
    </Fieldset>
  );
}
