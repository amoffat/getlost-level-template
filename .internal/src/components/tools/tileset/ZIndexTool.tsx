import Tip from "@/components/Tip";
import { useTranslation } from "react-i18next";

export default function ZIndexTool() {
  const { t } = useTranslation();
  return (
    <>
      <Tip
        tips={[
          t('zIndexToolTipMove'),
          t('zIndexToolTipBelow'),
          t('zIndexToolTipAbove'),
          t('zIndexToolTipDblClickAdd'),
          t('zIndexToolTipDblClickRemove'),
        ]}
      />
    </>
  );
}
