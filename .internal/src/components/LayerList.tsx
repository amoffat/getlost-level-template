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
import classes from "./styles/LayerList.module.css";

export interface Layer {
  id: number;
  description: string;
}

export interface LayerListProps {
  layerConstraints?: MapLayerName[];
}

export default function LayerList({ layerConstraints }: LayerListProps) {
  const layerState = useAppSelector(
    (state: RootState) => state.mapEditor.layers
  );
  const dispatch = useAppDispatch();

  const changeActiveLayer = useCallback(
    (id: number) => {
      dispatch(setActiveLayerThunk({ layer: id as MapLayerName }));
    },
    [dispatch]
  );

  const layers: Layer[] = useMemo(() => {
    return [
      {
        id: MapLayerName.Exterior,
        description:
          "Outdoor objects that can appear in front of and behind a character",
      },
      {
        id: MapLayerName.Ground,
        description: "Ground objects are always rendered beneath the character",
      },
      {
        id: MapLayerName.Sensors,
        description: "Areas that trigger events or define zones",
      },

      {
        id: MapLayerName.Special,
        description: "Special objects like gateways, lights, and waypoints",
      },
    ];
  }, []);

  return (
    <Fieldset legend="Layers" p="xs">
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
                    <Overlay
                      blur={3}
                      backgroundOpacity={0.2}
                      color="#ff0000ff"
                      radius="md"
                    />
                  )}
                  <Group wrap="nowrap" align="flex-start">
                    <Radio.Indicator />
                    <div>
                      <Text className={classes.label}>
                        {mapLayerToName(layer.id)}
                      </Text>
                      <Text className={classes.description}>
                        {layer.description}
                      </Text>
                    </div>
                  </Group>
                </Radio.Card>
              );
            })}
          </Stack>
        </Radio.Group>
        <Switch
          label="Lock inactive layers"
          checked={layerState.lockInactive}
          onChange={(event) => {
            dispatch(actions.setLockInactiveLayer(event.currentTarget.checked));
          }}
        />
        <Switch
          label="Dim inactive layers"
          checked={layerState.dimInactive}
          onChange={(event) => {
            dispatch(actions.setDimInactiveLayer(event.currentTarget.checked));
          }}
        />
      </Stack>
    </Fieldset>
  );
}
