import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { selectors as mapSelectors } from "@/slices/mapEditor";
import { bringToTopThunk, sendToBottomThunk } from "@/thunks/map";
import { MapLayerName } from "@/types/layer";
import {
  EntranceObj,
  ExitObj,
  isEntranceObj,
  isExitObj,
  isLightInstance,
  isNpcInstance,
  isTileGroupInstance,
  LightObj,
  NpcInstance,
  TileGroupInstance,
} from "@/types/map";
import { Alert, Button, Fieldset, Kbd, Stack } from "@mantine/core";
import {
  IconAlertTriangle,
  IconArrowBarToDown,
  IconArrowBarToUp,
} from "@tabler/icons-react";
import { ReactNode, useMemo } from "react";
import { ErrorBoundary } from "react-error-boundary";
import EntranceProperties from "../../objectProperties/EntranceProperties";
import ExitProperties from "../../objectProperties/ExitProperties";
import LightProperties from "../../objectProperties/LightProperties";
import NpcProperties from "../../objectProperties/NpcProperties";
import TileGroupProperties from "../../objectProperties/TileGroupProperties";
import Tip from "../../Tip";

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
      "Right click and drag on the map to pan the view.",
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

  const props = useMemo(() => {
    const tileGroups: TileGroupInstance[] = [];
    const lights: LightObj[] = [];
    const npcs: NpcInstance[] = [];
    const entrances: EntranceObj[] = [];
    const exits: ExitObj[] = [];

    for (const obj of selectedObjs) {
      if (isTileGroupInstance(obj)) {
        tileGroups.push(obj);
      } else if (isLightInstance(obj)) {
        lights.push(obj);
      } else if (isNpcInstance(obj)) {
        npcs.push(obj);
      } else if (isEntranceObj(obj)) {
        entrances.push(obj);
      } else if (isExitObj(obj)) {
        exits.push(obj);
      }
    }

    const typesCount = [
      tileGroups.length > 0,
      lights.length > 0,
      npcs.length > 0,
      entrances.length > 0,
      exits.length > 0,
    ].filter(Boolean).length;

    if (typesCount > 1) {
      return (
        <Alert
          variant="light"
          color="yellow"
          title="Mixed selection"
          icon={<IconAlertTriangle />}
        >
          Only objects of the same type can be edited at once.
        </Alert>
      );
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

    if (entrances.length > 0) {
      return <EntranceProperties key="entrance-props" objs={entrances} />;
    }

    if (exits.length > 0) {
      return <ExitProperties key="exit-props" objs={exits} />;
    }

    return null;
  }, [selectedObjs]);

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

      <ErrorBoundary
        resetKeys={[selectedObjs]}
        fallback={
          <Alert variant="filled" color="pink" title="Error">
            Properties failed to render
          </Alert>
        }
      >
        {props}
      </ErrorBoundary>
    </>
  );
}
