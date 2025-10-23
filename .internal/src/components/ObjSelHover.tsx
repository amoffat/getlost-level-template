import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { actions } from "@/slices/mapEditor";
import { isTileGroupInstance, TileGroupInstance } from "@/types/map";
import { Checkbox, Group, Stack } from "@mantine/core";
import { useCallback } from "react";
import { DynamicHoverCard } from "./DynamicHoverCard";
import classes from "./styles/ObjSelHover.module.css";
import TilesetGroup from "./TilesetGroup";

export default function ObjSelHover() {
  const proposed = useAppSelector((state) => state.mapEditor.proposedSelection);
  const curSelected = useAppSelector((state) => state.mapEditor.selectedIds);
  const tilesets = useAppSelector((state) => state.tilesetEditor.tilesets);
  const dispatch = useAppDispatch();

  const onChange = useCallback(
    (obj: TileGroupInstance, checked: boolean) => {
      if (checked) {
        dispatch(actions.addOneSelected(obj.id));
      } else {
        dispatch(actions.removeOneSelected(obj.id));
      }
    },
    [dispatch]
  );

  if (!proposed) return null;

  const items = [];
  for (const obj of proposed.objects) {
    if (!isTileGroupInstance(obj)) continue;

    const group = tilesets[obj.tilesetId].tiles.entities[obj.tileId];
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
          <TilesetGroup group={group} />
        </Group>
      </Checkbox.Card>
    );
    items.push(entry);
  }

  return (
    <DynamicHoverCard x={proposed.pos.x} y={proposed.pos.y} opened={true}>
      <Stack p={0}>{items}</Stack>
    </DynamicHoverCard>
  );
}
