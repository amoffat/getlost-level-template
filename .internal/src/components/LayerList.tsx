import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { actions } from "@/slices/mapEditor";
import { RootState } from "@/store/store";
import { setActiveLayerThunk } from "@/thunks/map";
import { MapLayerName } from "@/types/layer";
import { mapLayerToName } from "@/utils/layer";
import {
  Fieldset,
  Group,
  Overlay,
  Radio,
  Stack,
  Switch,
  Text,
} from "@mantine/core";
import { useCallback, useMemo } from "react";
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
  const dispatch = useAppDispatch();

  const changeActiveLayer = useCallback(
    (id: number) => {
      dispatch(setActiveLayerThunk({ layer: id as MapLayerName }));
    },
    [dispatch],
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
                </Radio.Card>
              );
            })}
          </Stack>
        </Radio.Group>
        <Switch
          label={t("layerListLockInactive")}
          checked={layerState.lockInactive}
          onChange={(event) => {
            dispatch(actions.setLockInactiveLayer(event.currentTarget.checked));
          }}
        />
        <Switch
          label={t("layerListDimInactive")}
          checked={layerState.dimInactive}
          onChange={(event) => {
            dispatch(actions.setDimInactiveLayer(event.currentTarget.checked));
          }}
        />
      </Stack>
    </Fieldset>
  );
}
