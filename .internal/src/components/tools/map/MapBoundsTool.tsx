import { ReactNode, useMemo } from "react";
import Tip from "../../Tip";

// Bounds constraints

export default function MapBoundsTool() {
  const tips: ReactNode[] = useMemo(() => {
    return [
      "Adjust the map boundaries by clicking and dragging.",
      "The bounds define the playable area of your level.",
    ];
  }, []);

  return (
    <>
      <Tip tips={tips} />
    </>
  );
}
