import AnimationProperties from "@/components/objectProperties/AnimationProperties";
import SinkZoneProperties from "@/components/objectProperties/zones/SinkZoneProperties";
import SoundZoneProperties from "@/components/objectProperties/zones/SoundZoneProperties";
import ZoomZoneProperties from "@/components/objectProperties/zones/ZoomZoneProperties";
import CollisionZoneProperties from "@/components/objectProperties/zones/CollisionZoneProperties";
import SensorZoneProperties from "@/components/objectProperties/zones/SensorZoneProperties";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { selectors as mapSelectors } from "@/slices/mapEditor";
import { bringToTopThunk, sendToBottomThunk } from "@/thunks/map";
import { MapLayerName } from "@/types/layer";
import {
  AnimationInstance,
  CollisionObj,
  EntranceObj,
  ExitObj,
  isAnimatedInstance,
  isCollisionZone,
  isEntranceObj,
  isExitObj,
  isLightInstance,
  isNpcInstance,
  isPickupObj,
  isSensorZoneObj,
  isSinkZoneObj,
  isSoundZoneObj,
  isTileGroupInstance,
  isZoomZoneObj,
  LightObj,
  NpcInstance,
  PickupObj,
  SensorZoneObj,
  SinkZoneObj,
  SoundZoneObj,
  TileGroupInstance,
  ZoomZoneObj,
} from "@/types/map";
import { Alert, Button, Fieldset, Kbd, Stack } from "@mantine/core";
import {
  IconAlertTriangle,
  IconArrowBarToDown,
  IconArrowBarToUp,
} from "@tabler/icons-react";
import { ReactNode, useDeferredValue, useMemo } from "react";
import { Trans, useTranslation } from "react-i18next";
import EntranceProperties from "../../objectProperties/EntranceProperties";
import ExitProperties from "../../objectProperties/ExitProperties";
import LightProperties from "../../objectProperties/LightProperties";
import NpcProperties from "../../objectProperties/NpcProperties";
import PickupProperties from "../../objectProperties/PickupProperties";
import TileGroupProperties from "../../objectProperties/TileGroupProperties";
import Tip from "../../Tip";

export default function SelectTool() {
  const { t } = useTranslation();
  const selectedObjs = useAppSelector(mapSelectors.selectedObjs);
  const deferredSelectedObjs = useDeferredValue(selectedObjs);

  const dispatch = useAppDispatch();
  const groundLayer = useAppSelector(
    (state) => state.mapEditor.layers.active === MapLayerName.Ground,
  );

  const selectedTgInstances = useMemo(() => {
    return deferredSelectedObjs.filter(isTileGroupInstance);
  }, [deferredSelectedObjs]);

  const tips: ReactNode[] = useMemo(() => {
    return [
      t("selectToolTip1"),
      t("selectToolTip2"),
      <Trans i18nKey="selectToolTip3">
        Hold <Kbd>Ctrl</Kbd> to add to or remove from the current selection.
      </Trans>,
      t("selectToolTip4"),
      t("selectToolTip5"),
      t("selectToolTip6"),
    ];
  }, [t]);

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
    const pickups: PickupObj[] = [];
    const animatedInstances: AnimationInstance[] = [];
    const collisionZones: CollisionObj[] = [];
    const sensorZones: SensorZoneObj[] = [];
    const sinkZones: SinkZoneObj[] = [];
    const zoomZones: ZoomZoneObj[] = [];
    const soundZones: SoundZoneObj[] = [];

    for (const obj of deferredSelectedObjs) {
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
      } else if (isPickupObj(obj)) {
        pickups.push(obj);
      } else if (isAnimatedInstance(obj)) {
        animatedInstances.push(obj);
      } else if (isSinkZoneObj(obj)) {
        sinkZones.push(obj);
      } else if (isZoomZoneObj(obj)) {
        zoomZones.push(obj);
      } else if (isSoundZoneObj(obj)) {
        soundZones.push(obj);
      } else if (isSensorZoneObj(obj)) {
        sensorZones.push(obj);
      } else if (isCollisionZone(obj)) {
        collisionZones.push(obj);
      }
    }

    const typesCount = [
      tileGroups.length > 0,
      lights.length > 0,
      npcs.length > 0,
      entrances.length > 0,
      exits.length > 0,
      pickups.length > 0,
      animatedInstances.length > 0,
      sinkZones.length > 0,
      zoomZones.length > 0,
      soundZones.length > 0,
    ].filter(Boolean).length;

    if (typesCount > 1) {
      return (
        <Alert
          variant="light"
          color="yellow"
          title={t("selectToolMixedSelectionTitle")}
          icon={<IconAlertTriangle />}
        >
          {t("selectToolMixedSelectionMsg")}
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

    if (pickups.length > 0) {
      return <PickupProperties key="pickup-props" objs={pickups} />;
    }

    if (animatedInstances.length > 0) {
      return (
        <AnimationProperties key="animation-props" objs={animatedInstances} />
      );
    }

    if (sinkZones.length > 0) {
      return <SinkZoneProperties key="sink-zone-props" objs={sinkZones} />;
    }

    if (zoomZones.length > 0) {
      return <ZoomZoneProperties key="zoom-zone-props" objs={zoomZones} />;
    }

    if (soundZones.length > 0) {
      return <SoundZoneProperties key="sound-zone-props" objs={soundZones} />;
    }

    if (sensorZones.length > 0) {
      return <SensorZoneProperties key="sensor-zone-props" objs={sensorZones} />;
    }

    if (collisionZones.length > 0) {
      return <CollisionZoneProperties key="collision-zone-props" objs={collisionZones} />;
    }

    return null;
  }, [deferredSelectedObjs, t]);

  const hasSelection = deferredSelectedObjs.length > 0;

  return (
    <>
      <Tip tips={tips} />

      {groundLayer && (
        <Fieldset legend={t("selectToolOrderingLegend")} p="xs">
          <Stack p={0}>
            <>
              <Button
                onClick={onBringToTop}
                variant="light"
                disabled={!hasSelection}
                leftSection={<IconArrowBarToUp size={14} />}
              >
                {t("selectToolBringToTop")}
              </Button>
              <Button
                onClick={onSendToBottom}
                variant="light"
                disabled={!hasSelection}
                leftSection={<IconArrowBarToDown size={14} />}
              >
                {t("selectToolSendToBottom")}
              </Button>
            </>
          </Stack>
        </Fieldset>
      )}

      {props}
    </>
  );
}
