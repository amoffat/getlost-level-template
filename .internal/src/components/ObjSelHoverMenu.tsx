import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { actions } from "@/slices/mapEditor";
import { selectors as tsSelectors } from "@/slices/tilesetEditor";
import { store } from "@/store/store";
import { AnimationTemplate } from "@/types/animation";
import {
  isAnimatedInstance,
  isNpcInstance,
  isTileGroupInstance,
  MapObj,
} from "@/types/map";
import { NpcTemplate } from "@/types/npc";
import { TileGroupTemplate } from "@/types/tilegroup";
import { Checkbox, Group, Stack } from "@mantine/core";
import { ReactNode, useCallback, useMemo } from "react";
import { DynamicHoverCard } from "./DynamicHoverCard";
import classes from "./styles/ObjSelHover.module.css";
import TileAnimation from "./TileAnimation";
import TilesetGroup from "./TilesetGroup";

export default function ObjSelHover() {
  const proposed = useAppSelector((state) => state.mapEditor.proposedSelection);
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
    [dispatch]
  );

  const items: ReactNode[] | undefined = useMemo(() => {
    const state = store.getState();

    return proposed?.objects.map((obj) => {
      let view: ReactNode | null = null;
      if (isTileGroupInstance(obj)) {
        const tsObj = tsSelectors.templateFromInstanceId(
          state,
          obj.tsObjId
        ) as TileGroupTemplate;

        view = <TilesetGroup group={tsObj} scale={2} bounded />;
      } else if (isAnimatedInstance(obj)) {
        const tsObj = tsSelectors.templateFromInstanceId(
          state,
          obj.tsObjId
        ) as AnimationTemplate;

        const frames = tsObj.frames.map((f) => {
          return { ...f, tg: f.tg };
        });
        view = <TileAnimation frames={frames} scale={2} bounded />;
      } else if (isNpcInstance(obj)) {
        const tsObj = tsSelectors.templateFromInstanceId(
          state,
          obj.tsObjId
        ) as NpcTemplate;

        const frames = tsObj.animations.Idle.frames.map((f) => {
          return { ...f, tg: f.tg };
        });
        view = <TileAnimation frames={frames} scale={2} bounded />;
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
  }, [curSelected, onChange, proposed?.objects]);

  if (!proposed) return null;

  return (
    <DynamicHoverCard x={proposed.pos.x} y={proposed.pos.y} opened={true}>
      <Stack p={0}>{items}</Stack>
    </DynamicHoverCard>
  );
}
