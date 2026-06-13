import { ZONE_TYPE_META } from "@/constants/zoneMeta";
import { globals as g } from "@/globals";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { actions, selectors as mapSelectors } from "@/slices/mapEditor";
import { selectors as tsSelectors } from "@/slices/tilesetEditor";
import { store } from "@/store/store";
import { AnimationTemplate } from "@/types/animation";
import {
  isAnimatedInstance,
  isBackgroundImageObj,
  isMapObjFromTileset,
  isNpcInstance,
  isZoneObj,
  MapObj,
} from "@/types/map";
import { NpcTemplate } from "@/types/npc";
import { TileGroupTemplate } from "@/types/tilegroup";
import { Badge, Checkbox, Group, Image, Stack } from "@mantine/core";
import { ReactNode, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { DynamicHoverCard } from "./DynamicHoverCard";
import classes from "./styles/ObjSelHover.module.css";
import TileAnimation from "./TileAnimation";
import TilesetGroup from "./TilesetGroup";

export default function ObjSelHover() {
  const { t } = useTranslation();
  const proposed = useAppSelector(mapSelectors.selectProposed);
  const curSelected = useAppSelector((state) => state.mapEditor.selectedIds);
  const dispatch = useAppDispatch();

  const onChange = useCallback(
    (obj: MapObj, checked: boolean) => {
      if (checked) {
        dispatch(actions.addOneSelected(obj.id));
      } else {
        dispatch(actions.removeOneSelected(obj.id));
      }
    },
    [dispatch],
  );

  const items: ReactNode[] | undefined = useMemo(() => {
    const state = store.getState();

    return proposed?.objects.map((obj) => {
      let view: ReactNode | null = null;

      if (isAnimatedInstance(obj)) {
        const tsObj = tsSelectors.templateFromId(
          state,
          obj.tsObjId,
        ) as AnimationTemplate | null;
        if (!tsObj) return null;

        const frames = tsObj.frames.map((f) => {
          return { ...f, tg: f.tg };
        });
        view = <TileAnimation frames={frames} scale={2} bounded />;
      } else if (isNpcInstance(obj)) {
        const tsObj = tsSelectors.templateFromId(
          state,
          obj.tsObjId,
        ) as NpcTemplate | null;
        if (!tsObj) return null;

        const frames = tsObj.animations.Idle.animation.frames.map((f) => {
          return { ...f, tg: f.tg };
        });
        view = <TileAnimation frames={frames} scale={2} bounded />;
      } else if (isBackgroundImageObj(obj)) {
        const src = g.backgroundImageObjectUrlCache.get(obj.imageId);
        if (!src) return null;

        view = <Image src={src} w={80} h={80} fit="cover" />;
      } else if (isZoneObj(obj)) {
        const typeMeta = ZONE_TYPE_META[obj.type]!;
        view = (
          <Badge
            color={typeMeta.cssColor}
            variant="filled"
            size="sm"
            autoContrast
          >
            {t(typeMeta.label)}
          </Badge>
        );
      } else if (isMapObjFromTileset(obj)) {
        const tsObj = tsSelectors.templateFromId(
          state,
          obj.tsObjId,
        ) as TileGroupTemplate | null;
        if (!tsObj) return null;

        view = <TilesetGroup group={tsObj} scale={2} bounded />;
      }

      const entry = (
        <Checkbox.Card
          className={classes.root}
          radius="xs"
          value={obj.id}
          key={obj.id}
          checked={curSelected.includes(obj.id)}
          onChange={(checked) => {
            onChange(obj, checked);
          }}
        >
          <Group wrap="nowrap" align="flex-start">
            <Checkbox.Indicator />
            {view}
          </Group>
        </Checkbox.Card>
      );
      return entry;
    });
  }, [curSelected, onChange, proposed?.objects, t]);

  if (!proposed || proposed.objects.length === 0) return null;

  return (
    <DynamicHoverCard
      key={`${proposed.pos.x}-${proposed.pos.y}`}
      x={proposed.pos.x}
      y={proposed.pos.y}
      opened={true}
      autoHideDelay={3000}
    >
      <Stack p={0}>{items}</Stack>
    </DynamicHoverCard>
  );
}
