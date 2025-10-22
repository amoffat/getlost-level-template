import { mapLayerToName } from "@/utils/layer";
import { Group, Radio, Stack, Text } from "@mantine/core";
import classes from "./styles/LayerList.module.css";

export interface Layer {
  id: number;
  description: string;
}

interface LayerListProps {
  layers: Layer[];
  selected: number;
  //   visible: number[];
  onChange: (id: number) => void;
  //   onToggleVisible: (id: number) => void;
}

export default function LayerList({
  layers,
  selected,
  //   visible,
  onChange,
  //   onToggleVisible,
}: LayerListProps) {
  return (
    <Radio.Group
      value={selected.toString()}
      onChange={(value) => onChange(Number(value))}
    >
      <Stack p={0} gap="xs">
        {layers.map((layer) => (
          <Radio.Card
            className={classes.root}
            radius="md"
            value={layer.id.toString()}
            key={mapLayerToName(layer.id)}
          >
            <Group wrap="nowrap" align="flex-start">
              <Radio.Indicator />
              <div>
                <Text className={classes.label}>
                  {mapLayerToName(layer.id)}
                </Text>
                <Text className={classes.description}>{layer.description}</Text>
              </div>
            </Group>
          </Radio.Card>
        ))}
      </Stack>
    </Radio.Group>
  );
}
