import { useTranslation } from "react-i18next";
import Tip from "../../Tip";

export default function TileReplaceTool() {
  const { t } = useTranslation();
  return (
    <>
      <Tip
        tips={[
          t('replaceToolTipDrag'),
          t('replaceToolTipMistake'),
        ]}
      />
    </>
  );
}
