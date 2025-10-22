import { Kbd } from "@mantine/core";
import { ReactNode, useMemo } from "react";
import Tip from "../Tip";

export default function SelectTool() {
  const tips: ReactNode[] = useMemo(() => {
    return [
      "Use click and drag to select multiple objects.",
      <>
        Hold <Kbd>Ctrl</Kbd> to add to or remove from the current selection.
      </>,
      "Click on an object to select it.",
      "Click on empty space to clear the selection.",
      "If you can't select an object, make sure the correct layer is active.",
    ];
  }, []);
  return (
    <>
      <Tip tips={tips} />
    </>
  );
}
