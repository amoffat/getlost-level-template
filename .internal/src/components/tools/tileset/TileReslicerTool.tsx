import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { actions, selectors } from "@/slices/tilesetEditor";
import { retileThunk } from "@/thunks/tileset";
import { Button, Fieldset, Stack } from "@mantine/core";
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
    [dispatch]
  );

  const resliceTiles = useCallback(() => {
    if (!ts) return;
    dispatch(retileThunk({ tsId: ts.id, gridSize: grid.size }));
  }, [dispatch, ts, grid.size]);

  if (!ts) return null;

  return (
    <>
      <Tip
        tips={[
          "Reslice will create new tiles based on the current grid size.",
          "Adjust the grid size to see a preview of how the tiles will be sliced.",
        ]}
      />
      <Fieldset legend="Reslicer" p="xs">
        <Stack p={0}>
          {!ts.composite && (
            <GridSizeInput defaultValue={grid.size} onChange={changeGridSize} />
          )}

          <Button variant="filled" fullWidth onClick={resliceTiles}>
            Slice
          </Button>
        </Stack>
      </Fieldset>
    </>
  );
}
