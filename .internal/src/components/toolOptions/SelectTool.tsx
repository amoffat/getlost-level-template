import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { selectors } from "@/slices/mapEditor";
import { store } from "@/store/store";
import { bringToTopThunk, sendToBottomThunk } from "@/thunks/map";
import { MapLayerName } from "@/types/layer";
import { isTileGroupInstance, TileGroupInstance } from "@/types/map";
import { Button, Fieldset, Kbd, Stack } from "@mantine/core";
import { IconArrowBarToDown, IconArrowBarToUp } from "@tabler/icons-react";
import { ReactNode, useMemo } from "react";
import Tip from "../Tip";

export default function SelectTool() {
  const hasSelection = useAppSelector(selectors.numSelectedTgInstances) > 0;
  const dispatch = useAppDispatch();
  const groundLayer = useAppSelector(
    (state) => state.mapEditor.layers.active === MapLayerName.Ground
  );

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

  const getCurSelectedTgInstances = (): TileGroupInstance[] => {
    const state = store.getState();
    const selectedObjs = selectors.selectedObjs(state);
    const selectedTgInstances = selectedObjs.filter(isTileGroupInstance);
    return selectedTgInstances;
  };

  const onBringToTop = () => {
    dispatch(bringToTopThunk(getCurSelectedTgInstances()));
  };

  const onSendToBottom = () => {
    dispatch(sendToBottomThunk(getCurSelectedTgInstances()));
  };

  return (
    <>
      <Tip tips={tips} />
      {groundLayer && (
        <Fieldset legend="Ordering" p="xs">
          <Stack p={0}>
            <>
              <Button
                onClick={onBringToTop}
                variant="light"
                disabled={!hasSelection}
                leftSection={<IconArrowBarToUp size={14} />}
              >
                Bring to top
              </Button>
              <Button
                onClick={onSendToBottom}
                variant="light"
                disabled={!hasSelection}
                leftSection={<IconArrowBarToDown size={14} />}
              >
                Send to bottom
              </Button>
            </>
          </Stack>
        </Fieldset>
      )}
    </>
  );
}
