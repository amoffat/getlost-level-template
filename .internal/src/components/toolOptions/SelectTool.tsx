import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { selectors as mapSelectors } from "@/slices/mapEditor";
import { bringToTopThunk, sendToBottomThunk } from "@/thunks/map";
import { MapLayerName } from "@/types/layer";
import {
  isLightInstance,
  isNpcInstance,
  isTileGroupInstance,
  LightObj,
  NpcInstance,
  TileGroupInstance,
} from "@/types/map";
import { Button, Fieldset, Kbd, Stack } from "@mantine/core";
import { IconArrowBarToDown, IconArrowBarToUp } from "@tabler/icons-react";
import { ReactNode, useMemo } from "react";
import LightProperties from "../objectProperties/LightProperties";
import NpcProperties from "../objectProperties/NpcProperties";
import TileGroupProperties from "../objectProperties/TileGroupProperties";
import Tip from "../Tip";

export default function SelectTool() {
  const selectedObjs = useAppSelector(mapSelectors.selectedObjs);
  const selectedTgInstances = useAppSelector(
    mapSelectors.selectedTileGroupInstances
  );
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

  const onBringToTop = () => {
    dispatch(bringToTopThunk(selectedTgInstances));
  };

  const onSendToBottom = () => {
    dispatch(sendToBottomThunk(selectedTgInstances));
  };

  // Separate selected objects by type
  const { tileGroups, lights, npcs } = useMemo(() => {
    const tileGroups: TileGroupInstance[] = [];
    const lights: LightObj[] = [];
    const npcs: NpcInstance[] = [];

    for (const obj of selectedObjs) {
      if (isTileGroupInstance(obj)) {
        tileGroups.push(obj);
      } else if (isLightInstance(obj)) {
        lights.push(obj);
      } else if (isNpcInstance(obj)) {
        npcs.push(obj);
      }
    }

    return { tileGroups, lights, npcs };
  }, [selectedObjs]);

  const props = useMemo(() => {
    // If we have a mixed selection, don't show properties
    if (tileGroups.length > 0 && lights.length > 0) {
      return null;
    }

    if (tileGroups.length > 0) {
      return <TileGroupProperties key="tg-props" objs={tileGroups} />;
    }

    if (lights.length > 0) {
      return <LightProperties key="light-props" objs={lights} />;
    }

    if (npcs.length > 0) {
      return <NpcProperties key="npc-props" objs={npcs} />;
    }

    return null;
  }, [tileGroups, lights, npcs]);

  const hasSelection = selectedObjs.length > 0;

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

      {props && (
        <Fieldset legend="Object properties" mt="md" p="xs">
          <Stack p={0}>{props}</Stack>
        </Fieldset>
      )}
    </>
  );
}
