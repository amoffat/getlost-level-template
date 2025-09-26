import { Group, Radio, Text } from "@mantine/core";
import classes from "./styles/RadioCard.module.css";

interface RadioCardProps {
  value: string;
  label: string;
  description: string;
}

export default function RadioCard({
  value,
  label,
  description,
}: RadioCardProps) {
  return (
    <Radio.Card className={classes.root} radius="xs" value={value} key={value}>
      <Group wrap="nowrap" align="flex-start">
        <Radio.Indicator />
        <div>
          <Text className={classes.label}>{label}</Text>
          <Text className={classes.description}>{description}</Text>
        </div>
      </Group>
    </Radio.Card>
  );
}
