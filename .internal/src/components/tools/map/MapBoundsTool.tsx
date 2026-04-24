import { ReactNode, useMemo } from "react";
import { useTranslation } from "react-i18next";
import Tip from "../../Tip";

// Bounds constraints

export default function MapBoundsTool() {
  const { t } = useTranslation();
  const tips: ReactNode[] = useMemo(() => {
    return [
      t("mapBoundsTip1"),
      t("mapBoundsTip2"),
    ];
  }, [t]);

  return (
    <>
      <Tip tips={tips} />
    </>
  );
}
