import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { actions, selectors } from "@/slices/tilesetEditor";
import { Fieldset, Stack } from "@mantine/core";
import { useCallback } from "react";
import GridSizeInput from "../../GridSizeInput";
import Tip from "../../Tip";

export default function TileReslicerTool() {
  const dispatch = useAppDispatch();
  const grid = useAppSelector((state) => state.tilesetEditor.grid);
  const ts = useAppSelector(selectors.activeTileset);

  const changeGridSize = useCallback(
    async (size: number | string) => {
      if (typeof size === "string") return;
      dispatch(actions.setGridSize(size));
    },
    [dispatch],
  );

  if (!ts) return null;

  return (
    <>
      <Tip
        tips={[
          "Click and drag on the tileset to select an area. Releasing the drag will reslice immediately.",
          "Adjust the grid size to change how the selection will be sliced.",
        ]}
      />
      <Fieldset legend="Reslicer" p="xs">
        <Stack p={0}>
          {!ts.composite && (
            <GridSizeInput defaultValue={grid.size} onChange={changeGridSize} />
          )}
        </Stack>
      </Fieldset>
    </>
  );
}
