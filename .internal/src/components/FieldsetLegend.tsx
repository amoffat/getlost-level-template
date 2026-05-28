import { Group, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import InfoTooltip from "./common/InfoTooltip";

interface FieldsetLegendProps {
  /** i18n key for the fieldset legend label */
  legendKey: string;
  /** i18n key for the info tooltip content */
  infoKey: string;
}

export default function FieldsetLegend({
  legendKey,
  infoKey,
}: FieldsetLegendProps) {
  const { t } = useTranslation();

  return (
    <Group p={0} gap={0}>
      {t(legendKey)}
      <InfoTooltip title={t(legendKey)}>
        <Text style={{ whiteSpace: "pre-line" }}>{t(infoKey)}</Text>
      </InfoTooltip>
    </Group>
  );
}
